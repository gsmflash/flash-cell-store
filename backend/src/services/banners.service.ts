import { and, asc, count, eq } from 'drizzle-orm';
import { db } from '../db/index';
import { banners } from '../db/schema/index';
import { AppError } from '../lib/appError';
import { toOffset, type PaginationQuery } from '../lib/pagination';

type BannerPosition = 'home_top' | 'home_middle' | 'home_bottom' | 'sidebar' | 'category';

export interface ListBannersParams extends PaginationQuery {
  position?: BannerPosition;
  includeInactive?: boolean;
}

export async function listBanners(params: ListBannersParams) {
  const { page, perPage, position, includeInactive } = params;
  const conditions = [
    ...(includeInactive ? [] : [eq(banners.isActive, true)]),
    ...(position ? [eq(banners.position, position)] : []),
  ];
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, [{ total }]] = await Promise.all([
    db.select().from(banners).where(whereClause).orderBy(asc(banners.sortOrder)).limit(perPage).offset(toOffset(page, perPage)),
    db.select({ total: count() }).from(banners).where(whereClause),
  ]);

  return { items, total };
}

export async function getBannerById(id: string) {
  const [row] = await db.select().from(banners).where(eq(banners.id, id)).limit(1);
  if (!row) throw AppError.notFound('Banner não encontrado.');
  return row;
}

export interface BannerInput {
  title: string;
  subtitle?: string;
  imageUrl: string;
  imageMobileUrl?: string;
  linkUrl?: string;
  altText?: string;
  position?: BannerPosition;
  sortOrder?: number;
  startsAt?: Date;
  endsAt?: Date;
}

export async function createBanner(input: BannerInput) {
  const [created] = await db
    .insert(banners)
    .values({
      title: input.title,
      subtitle: input.subtitle ?? null,
      imageUrl: input.imageUrl,
      imageMobileUrl: input.imageMobileUrl ?? null,
      linkUrl: input.linkUrl ?? null,
      altText: input.altText ?? null,
      position: input.position ?? 'home_top',
      sortOrder: input.sortOrder ?? 0,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
    })
    .returning();
  return created;
}

export type UpdateBannerInput = Partial<BannerInput> & { isActive?: boolean };

export async function updateBanner(id: string, input: UpdateBannerInput) {
  await getBannerById(id);
  const [updated] = await db
    .update(banners)
    .set({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.subtitle !== undefined && { subtitle: input.subtitle }),
      ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl }),
      ...(input.imageMobileUrl !== undefined && { imageMobileUrl: input.imageMobileUrl }),
      ...(input.linkUrl !== undefined && { linkUrl: input.linkUrl }),
      ...(input.altText !== undefined && { altText: input.altText }),
      ...(input.position !== undefined && { position: input.position }),
      ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      ...(input.startsAt !== undefined && { startsAt: input.startsAt }),
      ...(input.endsAt !== undefined && { endsAt: input.endsAt }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      updatedAt: new Date(),
    })
    .where(eq(banners.id, id))
    .returning();
  return updated;
}

export async function deactivateBanner(id: string) {
  await getBannerById(id);
  const [updated] = await db.update(banners).set({ isActive: false, updatedAt: new Date() }).where(eq(banners.id, id)).returning();
  return updated;
}
