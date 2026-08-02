import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/index';
import { favorites, products } from '../db/schema/index';
import { AppError } from '../lib/appError';

export async function listFavorites(customerId: string) {
  const rows = await db
    .select({
      id: favorites.id,
      productId: favorites.productId,
      createdAt: favorites.createdAt,
      productName: products.name,
      productSlug: products.slug,
      sellPrice: products.sellPrice,
      salePrice: products.salePrice,
      isActive: products.isActive,
    })
    .from(favorites)
    .innerJoin(products, eq(products.id, favorites.productId))
    .where(eq(favorites.customerId, customerId))
    .orderBy(desc(favorites.createdAt));

  return rows.map((row) => ({
    ...row,
    sellPrice: Number(row.sellPrice),
    salePrice: row.salePrice !== null ? Number(row.salePrice) : null,
  }));
}

export async function addFavorite(customerId: string, productId: string) {
  const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1);
  if (!product) throw AppError.notFound('Produto não encontrado.');

  const [existing] = await db
    .select({ id: favorites.id })
    .from(favorites)
    .where(and(eq(favorites.customerId, customerId), eq(favorites.productId, productId)))
    .limit(1);

  if (existing) return existing; // idempotente: favoritar de novo não duplica nem erra

  const [created] = await db.insert(favorites).values({ customerId, productId }).returning();
  return created;
}

export async function removeFavorite(customerId: string, productId: string) {
  await db.delete(favorites).where(and(eq(favorites.customerId, customerId), eq(favorites.productId, productId)));
}
