import { and, asc, count, desc, eq, gte, ilike, lte, sql } from 'drizzle-orm';
import { db } from '../db/index';
import {
  serviceOrders,
  diagnoses,
  servicesPerformed,
  partsUsed,
  serviceOrderHistory,
  entryChecklist,
  exitChecklist,
  technicians,
  customers,
  profiles,
} from '../db/schema/index';
import { AppError } from '../lib/appError';
import { toOffset, type PaginationQuery } from '../lib/pagination';
import { formatOsNumber, extractSequenceForYear } from '../lib/osNumber';
import { isValidStatusTransition, type ServiceOrderStatus } from '../lib/serviceOrderStatus';
import { assertCustomerExists } from './customers.service';
import { assertTechnicianExists } from './technicians.service';
import { registerMovementInTx, type DbTransaction } from './stock.service';
import { logAction } from '../lib/logger';
import { createWarrantyForServiceOrder } from './warranties.service';

type DeviceType = 'smartphone' | 'tablet' | 'smartwatch' | 'laptop' | 'desktop' | 'other';

function toApiOrder<T extends { estimatedValue: string | null; finalValue: string | null; discount: string | null }>(
  row: T,
) {
  return {
    ...row,
    estimatedValue: row.estimatedValue !== null ? Number(row.estimatedValue) : null,
    finalValue: row.finalValue !== null ? Number(row.finalValue) : null,
    discount: row.discount !== null ? Number(row.discount) : null,
  };
}

/**
 * Gera o próximo número sequencial de OS para o ano corrente (OS-AAAA-NNNN).
 * Usa um advisory lock escopado à transação para serializar criações
 * concorrentes — dois pedidos simultâneos nunca recebem o mesmo número.
 */
async function generateOsNumber(tx: DbTransaction): Promise<string> {
  const year = new Date().getFullYear();
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${'flash-cell-os-number-' + year}))`);

  const rows = await tx
    .select({ number: serviceOrders.number })
    .from(serviceOrders)
    .where(ilike(serviceOrders.number, `OS-${year}-%`));

  let maxSequence = 0;
  for (const row of rows) {
    const sequence = extractSequenceForYear(row.number, year);
    if (sequence !== null && sequence > maxSequence) maxSequence = sequence;
  }

  return formatOsNumber(year, maxSequence + 1);
}

export interface ListServiceOrdersParams extends PaginationQuery {
  status?: ServiceOrderStatus;
  technicianId?: string;
  customerId?: string;
  from?: Date;
  to?: Date;
}

export async function listServiceOrders(params: ListServiceOrdersParams) {
  const { page, perPage, status, technicianId, customerId, from, to } = params;

  const conditions = [
    ...(status ? [eq(serviceOrders.status, status)] : []),
    ...(technicianId ? [eq(serviceOrders.technicianId, technicianId)] : []),
    ...(customerId ? [eq(serviceOrders.customerId, customerId)] : []),
    ...(from ? [gte(serviceOrders.receivedAt, from)] : []),
    ...(to ? [lte(serviceOrders.receivedAt, to)] : []),
  ];
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, [{ total }]] = await Promise.all([
    db
      .select()
      .from(serviceOrders)
      .where(whereClause)
      .orderBy(desc(serviceOrders.receivedAt))
      .limit(perPage)
      .offset(toOffset(page, perPage)),
    db.select({ total: count() }).from(serviceOrders).where(whereClause),
  ]);

  return { items: items.map(toApiOrder), total };
}

async function getOrderRow(id: string) {
  const [order] = await db.select().from(serviceOrders).where(eq(serviceOrders.id, id)).limit(1);
  if (!order) throw AppError.notFound('Ordem de serviço não encontrada.');
  return order;
}

export async function getServiceOrderById(id: string) {
  const order = await getOrderRow(id);

  const [customer, technician, diagnosisRows, servicesRows, partsRows, historyRows, [entryRow], [exitRow]] =
    await Promise.all([
      db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1).then((r) => r[0] ?? null),
      order.technicianId
        ? db.select().from(technicians).where(eq(technicians.id, order.technicianId)).limit(1).then((r) => r[0] ?? null)
        : Promise.resolve(null),
      db.select().from(diagnoses).where(eq(diagnoses.serviceOrderId, id)).orderBy(desc(diagnoses.diagnosedAt)),
      db.select().from(servicesPerformed).where(eq(servicesPerformed.serviceOrderId, id)).orderBy(asc(servicesPerformed.createdAt)),
      db.select().from(partsUsed).where(eq(partsUsed.serviceOrderId, id)).orderBy(asc(partsUsed.createdAt)),
      db
        .select({
          id: serviceOrderHistory.id,
          serviceOrderId: serviceOrderHistory.serviceOrderId,
          userId: serviceOrderHistory.userId,
          userName: profiles.name,
          previousStatus: serviceOrderHistory.previousStatus,
          newStatus: serviceOrderHistory.newStatus,
          notes: serviceOrderHistory.notes,
          createdAt: serviceOrderHistory.createdAt,
        })
        .from(serviceOrderHistory)
        .leftJoin(profiles, eq(profiles.userId, serviceOrderHistory.userId))
        .where(eq(serviceOrderHistory.serviceOrderId, id))
        .orderBy(desc(serviceOrderHistory.createdAt)),
      db.select().from(entryChecklist).where(eq(entryChecklist.serviceOrderId, id)).limit(1),
      db.select().from(exitChecklist).where(eq(exitChecklist.serviceOrderId, id)).limit(1),
    ]);

  return {
    ...toApiOrder(order),
    customer,
    technician,
    diagnoses: diagnosisRows,
    servicesPerformed: servicesRows.map((s) => ({ ...s, price: Number(s.price) })),
    partsUsed: partsRows.map((p) => ({
      ...p,
      unitCost: p.unitCost !== null ? Number(p.unitCost) : null,
      unitPrice: Number(p.unitPrice),
    })),
    history: historyRows,
    entryChecklist: entryRow ?? null,
    exitChecklist: exitRow ?? null,
  };
}

export interface CreateServiceOrderInput {
  customerId: string;
  technicianId?: string;
  deviceType: DeviceType;
  deviceBrand: string;
  deviceModel: string;
  deviceColor?: string;
  deviceImei?: string;
  deviceImei2?: string;
  deviceSerial?: string;
  devicePassword?: string;
  estimatedValue?: number;
  estimatedCompletionAt?: Date;
  customerComplaint?: string;
  internalNotes?: string;
}

export async function createServiceOrder(userId: string, input: CreateServiceOrderInput) {
  await assertCustomerExists(input.customerId);
  if (input.technicianId) await assertTechnicianExists(input.technicianId);

  return db.transaction(async (tx) => {
    const number = await generateOsNumber(tx);

    const [order] = await tx
      .insert(serviceOrders)
      .values({
        number,
        customerId: input.customerId,
        technicianId: input.technicianId ?? null,
        status: 'received',
        deviceType: input.deviceType,
        deviceBrand: input.deviceBrand,
        deviceModel: input.deviceModel,
        deviceColor: input.deviceColor ?? null,
        deviceImei: input.deviceImei ?? null,
        deviceImei2: input.deviceImei2 ?? null,
        deviceSerial: input.deviceSerial ?? null,
        devicePassword: input.devicePassword ?? null,
        estimatedValue: input.estimatedValue !== undefined ? String(input.estimatedValue) : null,
        estimatedCompletionAt: input.estimatedCompletionAt ?? null,
        customerComplaint: input.customerComplaint ?? null,
        internalNotes: input.internalNotes ?? null,
      })
      .returning();

    await tx.insert(serviceOrderHistory).values({
      serviceOrderId: order.id,
      userId,
      previousStatus: null,
      newStatus: 'received',
      notes: 'OS aberta.',
    });

    return toApiOrder(order);
  });
}

export type UpdateServiceOrderInput = Partial<
  Omit<CreateServiceOrderInput, 'customerId'>
> & {
  finalValue?: number;
  discount?: number;
};

/** Edita dados da OS que não envolvem mudança de status (isso é changeServiceOrderStatus). */
export async function updateServiceOrder(id: string, input: UpdateServiceOrderInput) {
  await getOrderRow(id); // 404 se não existir
  if (input.technicianId) await assertTechnicianExists(input.technicianId);

  const [updated] = await db
    .update(serviceOrders)
    .set({
      ...(input.technicianId !== undefined && { technicianId: input.technicianId }),
      ...(input.deviceType !== undefined && { deviceType: input.deviceType }),
      ...(input.deviceBrand !== undefined && { deviceBrand: input.deviceBrand }),
      ...(input.deviceModel !== undefined && { deviceModel: input.deviceModel }),
      ...(input.deviceColor !== undefined && { deviceColor: input.deviceColor }),
      ...(input.deviceImei !== undefined && { deviceImei: input.deviceImei }),
      ...(input.deviceImei2 !== undefined && { deviceImei2: input.deviceImei2 }),
      ...(input.deviceSerial !== undefined && { deviceSerial: input.deviceSerial }),
      ...(input.devicePassword !== undefined && { devicePassword: input.devicePassword }),
      ...(input.estimatedValue !== undefined && { estimatedValue: String(input.estimatedValue) }),
      ...(input.finalValue !== undefined && { finalValue: String(input.finalValue) }),
      ...(input.discount !== undefined && { discount: String(input.discount) }),
      ...(input.estimatedCompletionAt !== undefined && { estimatedCompletionAt: input.estimatedCompletionAt }),
      ...(input.customerComplaint !== undefined && { customerComplaint: input.customerComplaint }),
      ...(input.internalNotes !== undefined && { internalNotes: input.internalNotes }),
      updatedAt: new Date(),
    })
    .where(eq(serviceOrders.id, id))
    .returning();

  return toApiOrder(updated);
}

export async function changeServiceOrderStatus(
  userId: string,
  id: string,
  newStatus: ServiceOrderStatus,
  notes?: string,
) {
  const order = await getOrderRow(id);
  const currentStatus = order.status as ServiceOrderStatus;

  if (!isValidStatusTransition(currentStatus, newStatus)) {
    throw AppError.conflict(`Transição de status inválida: "${currentStatus}" → "${newStatus}".`);
  }

  const updated = await db.transaction(async (tx) => {
    const now = new Date();
    const [updatedRow] = await tx
      .update(serviceOrders)
      .set({
        status: newStatus,
        updatedAt: now,
        ...(newStatus === 'done' && { completedAt: now }),
        ...(newStatus === 'delivered' && { deliveredAt: now }),
      })
      .where(eq(serviceOrders.id, id))
      .returning();

    await tx.insert(serviceOrderHistory).values({
      serviceOrderId: id,
      userId,
      previousStatus: currentStatus,
      newStatus,
      notes: notes ?? null,
    });

    return toApiOrder(updatedRow);
  });

  void logAction({
    userId,
    action: 'service_order.status_changed',
    entity: 'service_order',
    entityId: id,
    message: `OS ${order.number}: "${currentStatus}" → "${newStatus}".`,
  });

  if (newStatus === 'delivered') {
    void createWarrantyForServiceOrder(id, order.customerId, `Reparo — OS ${order.number} (${order.deviceBrand} ${order.deviceModel})`);
  }

  return updated;
}

// ─── Diagnósticos ─────────────────────────────────────────────────────────────

export interface AddDiagnosisInput {
  defectId?: string;
  technicianId?: string;
  description: string;
  solution?: string;
}

export async function addDiagnosis(id: string, input: AddDiagnosisInput) {
  await getOrderRow(id); // 404 se a OS não existir
  const [diagnosis] = await db
    .insert(diagnoses)
    .values({
      serviceOrderId: id,
      defectId: input.defectId ?? null,
      technicianId: input.technicianId ?? null,
      description: input.description,
      solution: input.solution ?? null,
    })
    .returning();
  return diagnosis;
}

// ─── Serviços executados ────────────────────────────────────────────────────────

export interface AddServicePerformedInput {
  serviceCatalogId?: string;
  technicianId?: string;
  name: string;
  description?: string;
  price: number;
  minutesSpent?: number;
}

export async function addServicePerformed(id: string, input: AddServicePerformedInput) {
  await getOrderRow(id);
  const [service] = await db
    .insert(servicesPerformed)
    .values({
      serviceOrderId: id,
      serviceCatalogId: input.serviceCatalogId ?? null,
      technicianId: input.technicianId ?? null,
      name: input.name,
      description: input.description ?? null,
      price: String(input.price),
      minutesSpent: input.minutesSpent ?? null,
    })
    .returning();
  return { ...service, price: Number(service.price) };
}

// ─── Peças utilizadas (com baixa automática de estoque) ─────────────────────────

export interface AddPartUsedInput {
  productId?: string;
  name: string;
  quantity: number;
  unitCost?: number;
  unitPrice: number;
}

/**
 * Registra a peça usada na OS e, se ela estiver vinculada a um produto do
 * catálogo, dá baixa no estoque na MESMA transação — se o estoque for
 * insuficiente, nem a peça é registrada (tudo ou nada).
 */
export async function addPartUsed(userId: string, id: string, input: AddPartUsedInput) {
  const order = await getOrderRow(id);

  return db.transaction(async (tx) => {
    const [part] = await tx
      .insert(partsUsed)
      .values({
        serviceOrderId: id,
        productId: input.productId ?? null,
        name: input.name,
        quantity: input.quantity,
        unitCost: input.unitCost !== undefined ? String(input.unitCost) : null,
        unitPrice: String(input.unitPrice),
      })
      .returning();

    if (input.productId) {
      await registerMovementInTx(tx, userId, {
        productId: input.productId,
        type: 'out',
        quantity: input.quantity,
        reference: order.number,
        notes: `Peça usada na OS ${order.number}`,
      });
    }

    return { ...part, unitCost: part.unitCost !== null ? Number(part.unitCost) : null, unitPrice: Number(part.unitPrice) };
  });
}

// ─── Checklists ──────────────────────────────────────────────────────────────

export interface EntryChecklistInput {
  screenCondition?: string;
  bodyCondition?: string;
  hasCase?: boolean;
  hasCharger?: boolean;
  hasEarphones?: boolean;
  hasMemoryCard?: boolean;
  hasSimCard?: boolean;
  batteryLevel?: number;
  powerOn?: boolean;
  extraItems?: string[];
  notes?: string;
}

/** Cria ou substitui o checklist de entrada (é 1-para-1 com a OS). */
export async function upsertEntryChecklist(id: string, input: EntryChecklistInput) {
  await getOrderRow(id);

  const [existing] = await db.select({ id: entryChecklist.id }).from(entryChecklist).where(eq(entryChecklist.serviceOrderId, id)).limit(1);

  const values = {
    screenCondition: input.screenCondition ?? null,
    bodyCondition: input.bodyCondition ?? null,
    hasCase: input.hasCase ?? false,
    hasCharger: input.hasCharger ?? false,
    hasEarphones: input.hasEarphones ?? false,
    hasMemoryCard: input.hasMemoryCard ?? false,
    hasSimCard: input.hasSimCard ?? false,
    batteryLevel: input.batteryLevel ?? null,
    powerOn: input.powerOn ?? true,
    extraItems: input.extraItems ?? [],
    notes: input.notes ?? null,
  };

  if (existing) {
    const [updated] = await db.update(entryChecklist).set(values).where(eq(entryChecklist.id, existing.id)).returning();
    return updated;
  }

  const [created] = await db.insert(entryChecklist).values({ serviceOrderId: id, ...values }).returning();
  return created;
}

export interface ExitChecklistInput {
  screenCondition?: string;
  bodyCondition?: string;
  functionalTest?: boolean;
  customerSignature?: string;
  returnedItems?: string[];
  notes?: string;
}

/** Cria ou substitui o checklist de saída (é 1-para-1 com a OS). */
export async function upsertExitChecklist(id: string, input: ExitChecklistInput) {
  await getOrderRow(id);

  const [existing] = await db.select({ id: exitChecklist.id }).from(exitChecklist).where(eq(exitChecklist.serviceOrderId, id)).limit(1);

  const values = {
    screenCondition: input.screenCondition ?? null,
    bodyCondition: input.bodyCondition ?? null,
    functionalTest: input.functionalTest ?? false,
    customerSignature: input.customerSignature ?? null,
    returnedItems: input.returnedItems ?? [],
    notes: input.notes ?? null,
  };

  if (existing) {
    const [updated] = await db.update(exitChecklist).set(values).where(eq(exitChecklist.id, existing.id)).returning();
    return updated;
  }

  const [created] = await db.insert(exitChecklist).values({ serviceOrderId: id, ...values }).returning();
  return created;
}
