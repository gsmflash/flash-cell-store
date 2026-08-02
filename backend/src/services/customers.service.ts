import { and, asc, count, eq, ilike, or } from 'drizzle-orm';
import { db } from '../db/index';
import { customers, users, profiles } from '../db/schema/index';
import { AppError } from '../lib/appError';
import { toOffset, type PaginationQuery } from '../lib/pagination';

export interface ListCustomersParams extends PaginationQuery {
  search?: string;
  includeInactive?: boolean;
}

export async function listCustomers(params: ListCustomersParams) {
  const { page, perPage, search, includeInactive } = params;

  const conditions = [
    ...(includeInactive ? [] : [eq(customers.isActive, true)]),
    ...(search
      ? [or(ilike(customers.name, `%${search}%`), ilike(customers.phone, `%${search}%`), ilike(customers.document, `%${search}%`))!]
      : []),
  ];
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, [{ total }]] = await Promise.all([
    db
      .select()
      .from(customers)
      .where(whereClause)
      .orderBy(asc(customers.name))
      .limit(perPage)
      .offset(toOffset(page, perPage)),
    db.select({ total: count() }).from(customers).where(whereClause),
  ]);

  return { items, total };
}

export async function getCustomerById(id: string) {
  const [customer] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  if (!customer) throw AppError.notFound('Cliente não encontrado.');
  return customer;
}

export interface CustomerInput {
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  document?: string;
  documentType?: 'cpf' | 'cnpj';
  notes?: string;
}

export async function createCustomer(input: CustomerInput) {
  const [created] = await db
    .insert(customers)
    .values({
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      whatsapp: input.whatsapp ?? null,
      document: input.document ?? null,
      documentType: input.documentType ?? null,
      notes: input.notes ?? null,
    })
    .returning();

  return created;
}

export type UpdateCustomerInput = Partial<CustomerInput> & { isActive?: boolean };

export async function updateCustomer(id: string, input: UpdateCustomerInput) {
  await getCustomerById(id); // 404 se não existir

  const [updated] = await db
    .update(customers)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.whatsapp !== undefined && { whatsapp: input.whatsapp }),
      ...(input.document !== undefined && { document: input.document }),
      ...(input.documentType !== undefined && { documentType: input.documentType }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      updatedAt: new Date(),
    })
    .where(eq(customers.id, id))
    .returning();

  return updated;
}

/** Soft delete: desativa o cliente (schema não tem hard delete). */
export async function deactivateCustomer(id: string) {
  await getCustomerById(id); // 404 se não existir
  const [updated] = await db
    .update(customers)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(customers.id, id))
    .returning();
  return updated;
}

/** Usado pelo módulo de ordens de serviço para validar customerId antes de criar uma OS. */
export async function assertCustomerExists(id: string): Promise<void> {
  const [customer] = await db.select({ id: customers.id }).from(customers).where(eq(customers.id, id)).limit(1);
  if (!customer) throw AppError.badRequest('Cliente informado não existe.');
}

/**
 * Retorna o id do registro `customers` vinculado a um usuário autenticado
 * (users.id), criando-o na primeira vez que esse usuário interage com algo
 * que exige um customerId (carrinho, pedido, favoritos). Um usuário pode
 * existir sem nunca ter comprado nada, então essa ponte não é criada no
 * registro — só quando é realmente necessária.
 */
export async function getOrCreateCustomerForUser(userId: string): Promise<string> {
  const [existing] = await db.select({ id: customers.id }).from(customers).where(eq(customers.userId, userId)).limit(1);
  if (existing) return existing.id;

  const [user] = await db
    .select({ email: users.email, name: profiles.name, phone: profiles.phone })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) throw AppError.notFound('Usuário não encontrado.');

  const [created] = await db
    .insert(customers)
    .values({ userId, name: user.name ?? user.email, email: user.email, phone: user.phone ?? null })
    .returning({ id: customers.id });

  return created.id;
}
