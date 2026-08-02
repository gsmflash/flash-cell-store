import { and, asc, count, eq, ilike, ne } from 'drizzle-orm';
import { db } from '../db/index';
import { brands } from '../db/schema/index';
import { AppError } from '../lib/appError';
import { generateUniqueSlug } from '../lib/slugify';
import { toOffset, type PaginationQuery } from '../lib/pagination';

export interface ListBrandsParams extends PaginationQuery {
  search?: string;
  /** Se true, inclui marcas inativas (uso administrativo). Público só vê ativas. */
  includeInactive?: boolean;
}

export async function listBrands(params: ListBrandsParams) {
  const { page, perPage, search, includeInactive } = params;

  const conditions = [
    ...(includeInactive ? [] : [eq(brands.isActive, true)]),
    ...(search ? [ilike(brands.name, `%${search}%`)] : []),
  ];
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, [{ total }]] = await Promise.all([
    db
      .select()
      .from(brands)
      .where(whereClause)
      .orderBy(asc(brands.name))
      .limit(perPage)
      .offset(toOffset(page, perPage)),
    db.select({ total: count() }).from(brands).where(whereClause),
  ]);

  return { items, total };
}

export async function getBrandById(id: string) {
  const [brand] = await db.select().from(brands).where(eq(brands.id, id)).limit(1);
  if (!brand) throw AppError.notFound('Marca não encontrada.');
  return brand;
}

async function slugExists(candidate: string, excludeId?: string): Promise<boolean> {
  const conditions = excludeId
    ? and(eq(brands.slug, candidate), ne(brands.id, excludeId))
    : eq(brands.slug, candidate);
  const [existing] = await db.select({ id: brands.id }).from(brands).where(conditions).limit(1);
  return !!existing;
}

export interface CreateBrandInput {
  name: string;
  logoUrl?: string;
}

export async function createBrand(input: CreateBrandInput) {
  const slug = await generateUniqueSlug(input.name, (candidate) => slugExists(candidate));

  const [created] = await db
    .insert(brands)
    .values({ name: input.name, slug, logoUrl: input.logoUrl ?? null })
    .returning();

  return created;
}

export interface UpdateBrandInput {
  name?: string;
  logoUrl?: string | null;
  isActive?: boolean;
}

export async function updateBrand(id: string, input: UpdateBrandInput) {
  await getBrandById(id); // 404 se não existir

  // Regenera o slug apenas se o nome mudou, mantendo o slug antigo estável
  // caso contrário (evita quebrar links existentes sem necessidade).
  const slug = input.name ? await generateUniqueSlug(input.name, (candidate) => slugExists(candidate, id)) : undefined;

  const [updated] = await db
    .update(brands)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(slug !== undefined && { slug }),
      ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      updatedAt: new Date(),
    })
    .where(eq(brands.id, id))
    .returning();

  return updated;
}

/** Soft delete: desativa a marca em vez de removê-la (schema não tem hard delete para catálogo). */
export async function deactivateBrand(id: string) {
  await getBrandById(id); // 404 se não existir
  const [updated] = await db
    .update(brands)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(brands.id, id))
    .returning();
  return updated;
}
