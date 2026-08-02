import { and, asc, count, eq } from 'drizzle-orm';
import { db } from '../db/index';
import { defects } from '../db/schema/index';
import { AppError } from '../lib/appError';
import { toOffset, type PaginationQuery } from '../lib/pagination';

type DeviceType = 'smartphone' | 'tablet' | 'smartwatch' | 'laptop' | 'desktop' | 'other';

export interface ListDefectsParams extends PaginationQuery {
  deviceType?: DeviceType;
  includeInactive?: boolean;
}

export async function listDefects(params: ListDefectsParams) {
  const { page, perPage, deviceType, includeInactive } = params;
  const conditions = [
    ...(includeInactive ? [] : [eq(defects.isActive, true)]),
    ...(deviceType ? [eq(defects.deviceType, deviceType)] : []),
  ];
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, [{ total }]] = await Promise.all([
    db.select().from(defects).where(whereClause).orderBy(asc(defects.name)).limit(perPage).offset(toOffset(page, perPage)),
    db.select({ total: count() }).from(defects).where(whereClause),
  ]);

  return { items, total };
}

export async function getDefectById(id: string) {
  const [defect] = await db.select().from(defects).where(eq(defects.id, id)).limit(1);
  if (!defect) throw AppError.notFound('Defeito não encontrado.');
  return defect;
}

export interface DefectInput {
  name: string;
  description?: string;
  deviceType?: DeviceType;
}

export async function createDefect(input: DefectInput) {
  const [created] = await db
    .insert(defects)
    .values({ name: input.name, description: input.description ?? null, deviceType: input.deviceType ?? null })
    .returning();
  return created;
}

export type UpdateDefectInput = Partial<DefectInput> & { isActive?: boolean };

export async function updateDefect(id: string, input: UpdateDefectInput) {
  await getDefectById(id);
  const [updated] = await db
    .update(defects)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.deviceType !== undefined && { deviceType: input.deviceType }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    })
    .where(eq(defects.id, id))
    .returning();
  return updated;
}

export async function deactivateDefect(id: string) {
  await getDefectById(id);
  const [updated] = await db.update(defects).set({ isActive: false }).where(eq(defects.id, id)).returning();
  return updated;
}
