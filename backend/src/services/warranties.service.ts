import { and, count, desc, eq, or } from 'drizzle-orm';
import { db } from '../db/index';
import { warranties, serviceOrders, customers, orderItems, partsUsed, products } from '../db/schema/index';
import { AppError } from '../lib/appError';
import { logAction } from '../lib/logger';
import { sendEmail } from '../lib/email';
import { DEFAULT_WARRANTY_DAYS, isWarrantyValid, type WarrantyType } from '../lib/warrantyRules';
import { findWarrantyPolicyById } from './warranty-policies.service';
import { toOffset, type PaginationQuery } from '../lib/pagination';

/** Data de fim a partir de dias corridos (usado quando há política vinculada). */
function computeEndDateFromDays(startDate: Date, days: number): Date {
  const end = new Date(startDate);
  end.setDate(end.getDate() + days);
  return end;
}

function toApiWarranty<T extends { startDate: string; endDate: string; isActive: boolean }>(row: T) {
  return { ...row, isValid: isWarrantyValid(row.isActive, new Date(row.endDate)) };
}

async function notifyCustomerAboutWarranty(customerId: string, description: string, endDate: Date) {
  const [customer] = await db.select({ email: customers.email, name: customers.name }).from(customers).where(eq(customers.id, customerId)).limit(1);
  if (!customer?.email) return;

  await sendEmail({
    to: customer.email,
    subject: 'Sua garantia Flash Cell Store',
    html: `
      <p>Olá, ${customer.name}!</p>
      <p>Sua garantia foi registrada com sucesso:</p>
      <p><strong>${description}</strong></p>
      <p>Válida até: <strong>${endDate.toLocaleDateString('pt-BR')}</strong></p>
      <p>Guarde este e-mail — ele serve como comprovante caso precise acionar a garantia.</p>
    `,
  });
}

/**
 * Chamado automaticamente quando uma OS é marcada como "delivered". Usa a
 * política de garantia vinculada às peças usadas no reparo, quando
 * existir (a de maior prazo, se houver mais de uma peça com política
 * diferente) — senão cai no padrão de 90 dias.
 */
export async function createWarrantyForServiceOrder(serviceOrderId: string, customerId: string, description: string) {
  const startDate = new Date();

  const usedParts = await db
    .select({ warrantyPolicyId: products.warrantyPolicyId })
    .from(partsUsed)
    .innerJoin(products, eq(products.id, partsUsed.productId))
    .where(and(eq(partsUsed.serviceOrderId, serviceOrderId)));

  let days = DEFAULT_WARRANTY_DAYS.service;
  for (const part of usedParts) {
    if (!part.warrantyPolicyId) continue;
    const policy = await findWarrantyPolicyById(part.warrantyPolicyId);
    if (policy?.isActive && policy.days > days) days = policy.days;
  }

  const endDate = computeEndDateFromDays(startDate, days);

  const [created] = await db
    .insert(warranties)
    .values({
      serviceOrderId,
      customerId,
      type: 'service',
      description,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
    })
    .returning();

  void notifyCustomerAboutWarranty(customerId, description, endDate);
  return created;
}

/**
 * Chamado automaticamente quando um pedido é marcado como "delivered" — uma
 * garantia por item físico, usando a política vinculada ao produto quando
 * existir (padrão de 90 dias caso contrário).
 */
export async function createWarrantiesForOrder(orderId: string, customerId: string) {
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const startDate = new Date();

  const created = [];
  for (const item of items) {
    if (!item.productId) continue; // produto pode ter sido removido do catálogo depois da compra

    const [product] = await db.select({ warrantyPolicyId: products.warrantyPolicyId }).from(products).where(eq(products.id, item.productId)).limit(1);
    let days = DEFAULT_WARRANTY_DAYS.store;
    if (product?.warrantyPolicyId) {
      const policy = await findWarrantyPolicyById(product.warrantyPolicyId);
      if (policy?.isActive) days = policy.days;
    }
    const endDate = computeEndDateFromDays(startDate, days);

    const [warranty] = await db
      .insert(warranties)
      .values({
        productId: item.productId,
        customerId,
        type: 'store',
        description: `Garantia de loja — ${item.productName}`,
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
      })
      .returning();
    created.push(warranty);
  }

  if (created.length > 0) {
    void notifyCustomerAboutWarranty(customerId, `${created.length} item(ns) do seu pedido`, computeEndDateFromDays(startDate, DEFAULT_WARRANTY_DAYS.store));
  }

  return created;
}

export interface ListWarrantiesParams extends PaginationQuery {
  customerId?: string;
  type?: WarrantyType;
  includeInactive?: boolean;
}

export async function listWarranties(params: ListWarrantiesParams) {
  const { page, perPage, customerId, type, includeInactive } = params;
  const conditions = [
    ...(includeInactive ? [] : [eq(warranties.isActive, true)]),
    ...(customerId ? [eq(warranties.customerId, customerId)] : []),
    ...(type ? [eq(warranties.type, type)] : []),
  ];
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, [{ total }]] = await Promise.all([
    db.select().from(warranties).where(whereClause).orderBy(desc(warranties.createdAt)).limit(perPage).offset(toOffset(page, perPage)),
    db.select({ total: count() }).from(warranties).where(whereClause),
  ]);

  return { items: items.map(toApiWarranty), total };
}

export async function getWarrantyById(id: string) {
  const [row] = await db.select().from(warranties).where(eq(warranties.id, id)).limit(1);
  if (!row) throw AppError.notFound('Garantia não encontrada.');
  return toApiWarranty(row);
}

/**
 * Consulta pública de garantia — não exige login. Busca por IMEI/número de
 * série (via a OS de origem) ou pelo documento do cliente (CPF/CNPJ, para
 * garantias de produto, que não têm número de série individual rastreado).
 */
export async function lookupPublicWarranties(params: { imei?: string; document?: string }) {
  if (!params.imei && !params.document) {
    throw AppError.badRequest('Informe o IMEI/número de série ou o CPF/CNPJ para consultar.');
  }

  const conditions = [];

  if (params.imei) {
    const matchingOrders = await db
      .select({ id: serviceOrders.id })
      .from(serviceOrders)
      .where(or(eq(serviceOrders.deviceImei, params.imei), eq(serviceOrders.deviceSerial, params.imei)));

    if (matchingOrders.length > 0) {
      conditions.push(...matchingOrders.map((o) => eq(warranties.serviceOrderId, o.id)));
    }
  }

  if (params.document) {
    const [customer] = await db.select({ id: customers.id }).from(customers).where(eq(customers.document, params.document)).limit(1);
    if (customer) conditions.push(eq(warranties.customerId, customer.id));
  }

  if (conditions.length === 0) return [];

  const rows = await db
    .select({
      id: warranties.id,
      type: warranties.type,
      description: warranties.description,
      startDate: warranties.startDate,
      endDate: warranties.endDate,
      isActive: warranties.isActive,
    })
    .from(warranties)
    .where(or(...conditions))
    .orderBy(desc(warranties.createdAt));

  return rows.map(toApiWarranty);
}

export async function voidWarranty(id: string, reason: string) {
  await getWarrantyById(id);
  const [updated] = await db
    .update(warranties)
    .set({ isActive: false, voidedReason: reason, voidedAt: new Date(), updatedAt: new Date() })
    .where(eq(warranties.id, id))
    .returning();
  return toApiWarranty(updated);
}

/**
 * Registra o acionamento de uma garantia. O schema atual não tem uma tabela
 * dedicada de "chamados de garantia" — então isso valida que a garantia
 * ainda está no prazo e registra o acionamento como log de auditoria. Um
 * técnico então abre uma nova OS normalmente para atender o chamado,
 * referenciando esta garantia na descrição/observações da nova OS.
 */
export async function claimWarranty(userId: string, id: string, notes?: string) {
  const warranty = await getWarrantyById(id);

  if (!warranty.isValid) {
    throw AppError.conflict('Esta garantia não está mais válida (expirada ou anulada).');
  }

  void logAction({
    userId,
    action: 'warranty.claimed',
    entity: 'warranty',
    entityId: id,
    message: `Garantia acionada.${notes ? ` ${notes}` : ''}`,
  });

  return warranty;
}
