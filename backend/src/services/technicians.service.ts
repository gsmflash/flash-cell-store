import { asc, count, eq } from 'drizzle-orm';
import { db } from '../db/index';
import { technicians, users, profiles } from '../db/schema/index';
import { AppError } from '../lib/appError';
import { toOffset, type PaginationQuery } from '../lib/pagination';

export interface ListTechniciansParams extends PaginationQuery {
  includeInactive?: boolean;
}

async function withUser<T extends { userId: string }>(row: T) {
  const [user] = await db
    .select({ id: users.id, email: users.email, name: profiles.name })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(users.id, row.userId))
    .limit(1);
  return { ...row, user: user ?? null };
}

export async function listTechnicians(params: ListTechniciansParams) {
  const { page, perPage, includeInactive } = params;
  const whereClause = includeInactive ? undefined : eq(technicians.isActive, true);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(technicians)
      .where(whereClause)
      .orderBy(asc(technicians.createdAt))
      .limit(perPage)
      .offset(toOffset(page, perPage)),
    db.select({ total: count() }).from(technicians).where(whereClause),
  ]);

  const items = await Promise.all(rows.map(withUser));
  return { items, total };
}

export async function getTechnicianById(id: string) {
  const [row] = await db.select().from(technicians).where(eq(technicians.id, id)).limit(1);
  if (!row) throw AppError.notFound('Técnico não encontrado.');
  return withUser(row);
}

/** Usado pelo módulo de ordens de serviço para validar technicianId. */
export async function assertTechnicianExists(id: string): Promise<void> {
  const [row] = await db.select({ id: technicians.id }).from(technicians).where(eq(technicians.id, id)).limit(1);
  if (!row) throw AppError.badRequest('Técnico informado não existe.');
}

export interface CreateTechnicianInput {
  userId: string;
  specialties?: string[];
}

export async function createTechnician(input: CreateTechnicianInput) {
  const [user] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, input.userId)).limit(1);
  if (!user) throw AppError.badRequest('Usuário informado não existe.');

  const [existing] = await db.select({ id: technicians.id }).from(technicians).where(eq(technicians.userId, input.userId)).limit(1);
  if (existing) throw AppError.conflict('Este usuário já é um técnico.');

  // Promove o usuário para o papel de técnico, se ainda não for admin.
  if (user.role === 'customer') {
    await db.update(users).set({ role: 'technician', updatedAt: new Date() }).where(eq(users.id, input.userId));
  }

  const [created] = await db
    .insert(technicians)
    .values({ userId: input.userId, specialties: input.specialties ?? [] })
    .returning();

  return withUser(created);
}

export interface UpdateTechnicianInput {
  specialties?: string[];
  isActive?: boolean;
}

export async function updateTechnician(id: string, input: UpdateTechnicianInput) {
  const [existing] = await db.select().from(technicians).where(eq(technicians.id, id)).limit(1);
  if (!existing) throw AppError.notFound('Técnico não encontrado.');

  const [updated] = await db
    .update(technicians)
    .set({
      ...(input.specialties !== undefined && { specialties: input.specialties }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      updatedAt: new Date(),
    })
    .where(eq(technicians.id, id))
    .returning();

  return withUser(updated);
}
