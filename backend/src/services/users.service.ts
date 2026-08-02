import { and, asc, count, eq, ilike } from 'drizzle-orm';
import { db } from '../db/index';
import { users, profiles } from '../db/schema/index';
import { AppError } from '../lib/appError';
import { toOffset, type PaginationQuery } from '../lib/pagination';

type UserRole = 'admin' | 'technician' | 'customer';

export interface ListUsersParams extends PaginationQuery {
  search?: string;
  role?: UserRole;
}

async function withProfile<T extends { id: string }>(row: T) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, row.id)).limit(1);
  return { ...row, profile: profile ?? null };
}

export async function listUsers(params: ListUsersParams) {
  const { page, perPage, search, role } = params;

  const conditions = [...(role ? [eq(users.role, role)] : []), ...(search ? [ilike(users.email, `%${search}%`)] : [])];
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .where(whereClause)
      .orderBy(asc(users.email))
      .limit(perPage)
      .offset(toOffset(page, perPage)),
    db.select({ total: count() }).from(users).where(whereClause),
  ]);

  const items = await Promise.all(rows.map(withProfile));
  return { items, total };
}

export async function getUserById(id: string) {
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!row) throw AppError.notFound('Usuário não encontrado.');
  return withProfile(row);
}

/**
 * Muda o papel de um usuário. Não permite que um admin remova o próprio
 * acesso de administrador, para evitar se trancar para fora acidentalmente.
 */
export async function updateUserRole(requestingUserId: string, targetUserId: string, role: UserRole) {
  if (requestingUserId === targetUserId && role !== 'admin') {
    throw AppError.badRequest('Você não pode remover seu próprio acesso de administrador.');
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, targetUserId)).limit(1);
  if (!existing) throw AppError.notFound('Usuário não encontrado.');

  const [updated] = await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, targetUserId))
    .returning({ id: users.id, email: users.email, role: users.role, isActive: users.isActive });

  return updated;
}

export async function setUserActive(requestingUserId: string, targetUserId: string, isActive: boolean) {
  if (requestingUserId === targetUserId && !isActive) {
    throw AppError.badRequest('Você não pode desativar a própria conta.');
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, targetUserId)).limit(1);
  if (!existing) throw AppError.notFound('Usuário não encontrado.');

  const [updated] = await db
    .update(users)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(users.id, targetUserId))
    .returning({ id: users.id, email: users.email, role: users.role, isActive: users.isActive });

  return updated;
}
