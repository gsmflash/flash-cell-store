import { and, eq, count, ilike } from 'drizzle-orm';
import { db } from '../db/index';
import { warrantyPolicies } from '../db/schema/index';
import { AppError } from '../lib/appError';
import { toOffset, type PaginationQuery } from '../lib/pagination';

export interface ListWarrantyPoliciesParams extends PaginationQuery {
  includeInactive?: boolean;
  search?: string;
}

export async function listWarrantyPolicies(params: ListWarrantyPoliciesParams) {
  const { page, perPage, includeInactive, search } = params;
  const conditions = [
    ...(includeInactive ? [] : [eq(warrantyPolicies.isActive, true)]),
    ...(search ? [ilike(warrantyPolicies.name, `%${search}%`)] : []),
  ];
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, [{ total }]] = await Promise.all([
    db.select().from(warrantyPolicies).where(whereClause).orderBy(warrantyPolicies.name).limit(perPage).offset(toOffset(page, perPage)),
    db.select({ total: count() }).from(warrantyPolicies).where(whereClause),
  ]);

  return { items, total };
}

export async function getWarrantyPolicyById(id: string) {
  const [row] = await db.select().from(warrantyPolicies).where(eq(warrantyPolicies.id, id)).limit(1);
  if (!row) throw AppError.notFound('Política de garantia não encontrada.');
  return row;
}

/** Usado internamente pela geração automática de garantia — retorna null em vez de lançar erro. */
export async function findWarrantyPolicyById(id: string) {
  const [row] = await db.select().from(warrantyPolicies).where(eq(warrantyPolicies.id, id)).limit(1);
  return row ?? null;
}

export interface WarrantyPolicyInput {
  name: string;
  description?: string;
  days: number;
  notes?: string;
}

export async function createWarrantyPolicy(input: WarrantyPolicyInput) {
  const [created] = await db
    .insert(warrantyPolicies)
    .values({
      name: input.name,
      description: input.description ?? null,
      days: input.days,
      notes: input.notes ?? null,
    })
    .returning();
  return created;
}

export type UpdateWarrantyPolicyInput = Partial<WarrantyPolicyInput> & { isActive?: boolean };

export async function updateWarrantyPolicy(id: string, input: UpdateWarrantyPolicyInput) {
  await getWarrantyPolicyById(id);
  const [updated] = await db
    .update(warrantyPolicies)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description || null }),
      ...(input.days !== undefined && { days: input.days }),
      ...(input.notes !== undefined && { notes: input.notes || null }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      updatedAt: new Date(),
    })
    .where(eq(warrantyPolicies.id, id))
    .returning();
  return updated;
}

export async function deleteWarrantyPolicy(id: string) {
  await getWarrantyPolicyById(id);
  // Hard delete de verdade aqui (diferente do resto do catálogo, que só
  // desativa): política de garantia não tem histórico de venda vinculado
  // diretamente a ela (as garantias já emitidas guardam a duração própria,
  // não uma referência a esta política) — então não há perda de dados.
  // Produtos que referenciavam essa política simplesmente voltam a usar o
  // padrão (ON DELETE SET NULL no schema).
  await db.delete(warrantyPolicies).where(eq(warrantyPolicies.id, id));
}

/** Usado pelo módulo de produtos para validar o warrantyPolicyId antes de salvar. */
export async function assertWarrantyPolicyExists(id: string): Promise<void> {
  const [row] = await db.select({ id: warrantyPolicies.id }).from(warrantyPolicies).where(eq(warrantyPolicies.id, id)).limit(1);
  if (!row) throw AppError.badRequest('Política de garantia informada não existe.');
}
