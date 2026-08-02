import { and, asc, eq, ne } from 'drizzle-orm';
import { db } from '../db/index';
import { categories } from '../db/schema/index';
import { AppError } from '../lib/appError';
import { generateUniqueSlug } from '../lib/slugify';

export type CategoryRow = typeof categories.$inferSelect;

export interface CategoryTreeNode extends CategoryRow {
  children: CategoryTreeNode[];
}

export interface ListCategoriesParams {
  includeInactive?: boolean;
}

/** Lista plana, ordenada por sortOrder e depois nome. */
export async function listCategoriesFlat(params: ListCategoriesParams = {}): Promise<CategoryRow[]> {
  const whereClause = params.includeInactive ? undefined : eq(categories.isActive, true);
  return db.select().from(categories).where(whereClause).orderBy(asc(categories.sortOrder), asc(categories.name));
}

/** Monta a árvore hierárquica a partir da lista plana. */
export async function listCategoriesTree(params: ListCategoriesParams = {}): Promise<CategoryTreeNode[]> {
  const flat = await listCategoriesFlat(params);

  const byId = new Map<string, CategoryTreeNode>();
  for (const category of flat) {
    byId.set(category.id, { ...category, children: [] });
  }

  const roots: CategoryTreeNode[] = [];
  for (const category of byId.values()) {
    if (category.parentId) {
      const parent = byId.get(category.parentId);
      // Se o pai não estiver na lista (ex.: pai inativo e includeInactive=false),
      // trata como raiz para não perder o registro silenciosamente.
      if (parent) {
        parent.children.push(category);
        continue;
      }
    }
    roots.push(category);
  }

  return roots;
}

export async function getCategoryById(id: string): Promise<CategoryTreeNode> {
  const [category] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (!category) throw AppError.notFound('Categoria não encontrada.');

  const children = await db
    .select()
    .from(categories)
    .where(eq(categories.parentId, id))
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  return { ...category, children: children.map((child) => ({ ...child, children: [] })) };
}

async function slugExists(candidate: string, excludeId?: string): Promise<boolean> {
  const conditions = excludeId
    ? and(eq(categories.slug, candidate), ne(categories.id, excludeId))
    : eq(categories.slug, candidate);
  const [existing] = await db.select({ id: categories.id }).from(categories).where(conditions).limit(1);
  return !!existing;
}

async function assertParentExists(parentId: string): Promise<void> {
  const [parent] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, parentId)).limit(1);
  if (!parent) throw AppError.badRequest('Categoria pai informada não existe.');
}

export interface CreateCategoryInput {
  name: string;
  parentId?: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
}

export async function createCategory(input: CreateCategoryInput) {
  if (input.parentId) await assertParentExists(input.parentId);

  const slug = await generateUniqueSlug(input.name, (candidate) => slugExists(candidate));

  const [created] = await db
    .insert(categories)
    .values({
      name: input.name,
      slug,
      parentId: input.parentId ?? null,
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
      sortOrder: input.sortOrder ?? 0,
    })
    .returning();

  return created;
}

export interface UpdateCategoryInput {
  name?: string;
  parentId?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  await getCategoryById(id); // 404 se não existir

  if (input.parentId) {
    if (input.parentId === id) {
      throw AppError.badRequest('Uma categoria não pode ser pai dela mesma.');
    }
    await assertParentExists(input.parentId);
  }

  const slug = input.name ? await generateUniqueSlug(input.name, (candidate) => slugExists(candidate, id)) : undefined;

  const [updated] = await db
    .update(categories)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(slug !== undefined && { slug }),
      ...(input.parentId !== undefined && { parentId: input.parentId }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl }),
      ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      updatedAt: new Date(),
    })
    .where(eq(categories.id, id))
    .returning();

  return updated;
}

/** Soft delete: desativa a categoria (os filhos permanecem e continuam referenciando o parentId). */
export async function deactivateCategory(id: string) {
  await getCategoryById(id); // 404 se não existir
  const [updated] = await db
    .update(categories)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(categories.id, id))
    .returning();
  return updated;
}
