import { and, asc, count, eq, ilike } from 'drizzle-orm';
import { db } from '../db/index';
import { suppliers } from '../db/schema/index';
import { AppError } from '../lib/appError';
import { toOffset, type PaginationQuery } from '../lib/pagination';

export interface ListSuppliersParams extends PaginationQuery {
  search?: string;
  includeInactive?: boolean;
}

export async function listSuppliers(params: ListSuppliersParams) {
  const { page, perPage, search, includeInactive } = params;

  const conditions = [
    ...(includeInactive ? [] : [eq(suppliers.isActive, true)]),
    ...(search ? [ilike(suppliers.name, `%${search}%`)] : []),
  ];
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, [{ total }]] = await Promise.all([
    db
      .select()
      .from(suppliers)
      .where(whereClause)
      .orderBy(asc(suppliers.name))
      .limit(perPage)
      .offset(toOffset(page, perPage)),
    db.select({ total: count() }).from(suppliers).where(whereClause),
  ]);

  return { items, total };
}

export async function getSupplierById(id: string) {
  const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
  if (!supplier) throw AppError.notFound('Fornecedor não encontrado.');
  return supplier;
}

export interface SupplierInput {
  name: string;
  tradeName?: string;
  document?: string;
  email?: string;
  phone?: string;
  website?: string;
  contactName?: string;
  notes?: string;
}

export async function createSupplier(input: SupplierInput) {
  const [created] = await db
    .insert(suppliers)
    .values({
      name: input.name,
      tradeName: input.tradeName ?? null,
      document: input.document ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      website: input.website ?? null,
      contactName: input.contactName ?? null,
      notes: input.notes ?? null,
    })
    .returning();

  return created;
}

export type UpdateSupplierInput = Partial<SupplierInput> & { isActive?: boolean };

export async function updateSupplier(id: string, input: UpdateSupplierInput) {
  await getSupplierById(id); // 404 se não existir

  const [updated] = await db
    .update(suppliers)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.tradeName !== undefined && { tradeName: input.tradeName }),
      ...(input.document !== undefined && { document: input.document }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.website !== undefined && { website: input.website }),
      ...(input.contactName !== undefined && { contactName: input.contactName }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      updatedAt: new Date(),
    })
    .where(eq(suppliers.id, id))
    .returning();

  return updated;
}

/** Soft delete: desativa o fornecedor (schema não tem hard delete). */
export async function deactivateSupplier(id: string) {
  await getSupplierById(id); // 404 se não existir
  const [updated] = await db
    .update(suppliers)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(suppliers.id, id))
    .returning();
  return updated;
}
