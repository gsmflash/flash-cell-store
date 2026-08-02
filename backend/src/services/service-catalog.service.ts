import { and, asc, count, eq } from 'drizzle-orm';
import { db } from '../db/index';
import { servicesCatalog } from '../db/schema/index';
import { AppError } from '../lib/appError';
import { toOffset, type PaginationQuery } from '../lib/pagination';

type DeviceType = 'smartphone' | 'tablet' | 'smartwatch' | 'laptop' | 'desktop' | 'other';

function toApi<T extends { price: string }>(row: T) {
  return { ...row, price: Number(row.price) };
}

export interface ListServiceCatalogParams extends PaginationQuery {
  deviceType?: DeviceType;
  includeInactive?: boolean;
}

export async function listServiceCatalog(params: ListServiceCatalogParams) {
  const { page, perPage, deviceType, includeInactive } = params;
  const conditions = [
    ...(includeInactive ? [] : [eq(servicesCatalog.isActive, true)]),
    ...(deviceType ? [eq(servicesCatalog.deviceType, deviceType)] : []),
  ];
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, [{ total }]] = await Promise.all([
    db
      .select()
      .from(servicesCatalog)
      .where(whereClause)
      .orderBy(asc(servicesCatalog.name))
      .limit(perPage)
      .offset(toOffset(page, perPage)),
    db.select({ total: count() }).from(servicesCatalog).where(whereClause),
  ]);

  return { items: items.map(toApi), total };
}

export async function getServiceCatalogById(id: string) {
  const [row] = await db.select().from(servicesCatalog).where(eq(servicesCatalog.id, id)).limit(1);
  if (!row) throw AppError.notFound('Serviço não encontrado no catálogo.');
  return toApi(row);
}

export interface ServiceCatalogInput {
  name: string;
  description?: string;
  price: number;
  estimatedMinutes?: number;
  deviceType?: DeviceType;
}

export async function createServiceCatalog(input: ServiceCatalogInput) {
  const [created] = await db
    .insert(servicesCatalog)
    .values({
      name: input.name,
      description: input.description ?? null,
      price: String(input.price),
      estimatedMinutes: input.estimatedMinutes ?? null,
      deviceType: input.deviceType ?? null,
    })
    .returning();
  return toApi(created);
}

export type UpdateServiceCatalogInput = Partial<ServiceCatalogInput> & { isActive?: boolean };

export async function updateServiceCatalog(id: string, input: UpdateServiceCatalogInput) {
  await getServiceCatalogById(id);
  const [updated] = await db
    .update(servicesCatalog)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.price !== undefined && { price: String(input.price) }),
      ...(input.estimatedMinutes !== undefined && { estimatedMinutes: input.estimatedMinutes }),
      ...(input.deviceType !== undefined && { deviceType: input.deviceType }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      updatedAt: new Date(),
    })
    .where(eq(servicesCatalog.id, id))
    .returning();
  return toApi(updated);
}

export async function deactivateServiceCatalog(id: string) {
  await getServiceCatalogById(id);
  const [updated] = await db
    .update(servicesCatalog)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(servicesCatalog.id, id))
    .returning();
  return toApi(updated);
}
