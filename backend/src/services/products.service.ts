import { and, asc, count, desc, eq, gte, ilike, lte, ne } from 'drizzle-orm';
import { db } from '../db/index';
import { products, productImages, brands, categories, stock, warrantyPolicies } from '../db/schema/index';
import { AppError } from '../lib/appError';
import { generateUniqueSlug } from '../lib/slugify';
import { uploadImage, deleteImageByUrl } from '../lib/r2Storage';
import { assertWarrantyPolicyExists } from './warranty-policies.service';
import { toOffset, type PaginationQuery } from '../lib/pagination';

export interface ListProductsParams extends PaginationQuery {
  search?: string;
  brandId?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  isFeatured?: boolean;
  includeInactive?: boolean;
}

/** Converte campos numeric (retornados como string pelo driver) para number na resposta da API. */
function toApiProduct<T extends { sellPrice: string | null; costPrice: string | null; salePrice: string | null }>(
  product: T,
) {
  return {
    ...product,
    sellPrice: product.sellPrice !== null ? Number(product.sellPrice) : null,
    costPrice: product.costPrice !== null ? Number(product.costPrice) : null,
    salePrice: product.salePrice !== null ? Number(product.salePrice) : null,
  };
}

export async function listProducts(params: ListProductsParams) {
  const { page, perPage, search, brandId, categoryId, minPrice, maxPrice, isFeatured, includeInactive } = params;

  const conditions = [
    ...(includeInactive ? [] : [eq(products.isActive, true)]),
    ...(search ? [ilike(products.name, `%${search}%`)] : []),
    ...(brandId ? [eq(products.brandId, brandId)] : []),
    ...(categoryId ? [eq(products.categoryId, categoryId)] : []),
    ...(minPrice !== undefined ? [gte(products.sellPrice, String(minPrice))] : []),
    ...(maxPrice !== undefined ? [lte(products.sellPrice, String(maxPrice))] : []),
    ...(isFeatured !== undefined ? [eq(products.isFeatured, isFeatured)] : []),
  ];
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, [{ total }]] = await Promise.all([
    db
      .select()
      .from(products)
      .where(whereClause)
      .orderBy(desc(products.isFeatured), asc(products.name))
      .limit(perPage)
      .offset(toOffset(page, perPage)),
    db.select({ total: count() }).from(products).where(whereClause),
  ]);

  return { items: items.map(toApiProduct), total };
}

async function attachDetails(product: typeof products.$inferSelect) {
  const [images, [stockRow], [brand], [category], [warrantyPolicy]] = await Promise.all([
    db.select().from(productImages).where(eq(productImages.productId, product.id)).orderBy(asc(productImages.sortOrder)),
    db.select().from(stock).where(eq(stock.productId, product.id)).limit(1),
    product.brandId ? db.select().from(brands).where(eq(brands.id, product.brandId)).limit(1) : Promise.resolve([]),
    product.categoryId
      ? db.select().from(categories).where(eq(categories.id, product.categoryId)).limit(1)
      : Promise.resolve([]),
    product.warrantyPolicyId
      ? db.select().from(warrantyPolicies).where(eq(warrantyPolicies.id, product.warrantyPolicyId)).limit(1)
      : Promise.resolve([]),
  ]);

  return {
    ...toApiProduct(product),
    images,
    stock: stockRow ?? null,
    brand: brand ?? null,
    category: category ?? null,
    warrantyPolicy: warrantyPolicy ?? null,
  };
}

export async function getProductById(id: string) {
  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!product) throw AppError.notFound('Produto não encontrado.');
  return attachDetails(product);
}

export async function getProductBySlug(slug: string) {
  const [product] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  if (!product) throw AppError.notFound('Produto não encontrado.');
  return attachDetails(product);
}

async function slugExists(candidate: string, excludeId?: string): Promise<boolean> {
  const conditions = excludeId
    ? and(eq(products.slug, candidate), ne(products.id, excludeId))
    : eq(products.slug, candidate);
  const [existing] = await db.select({ id: products.id }).from(products).where(conditions).limit(1);
  return !!existing;
}

export interface ProductInput {
  name: string;
  brandId?: string;
  categoryId?: string;
  sku?: string;
  barcode?: string;
  description?: string;
  shortDescription?: string;
  costPrice?: number;
  sellPrice: number;
  salePrice?: number;
  weight?: number;
  heightCm?: number;
  widthCm?: number;
  depthCm?: number;
  isFeatured?: boolean;
  isService?: boolean;
  warrantyPolicyId?: string;
}

async function assertBrandExists(brandId: string): Promise<void> {
  const [brand] = await db.select({ id: brands.id }).from(brands).where(eq(brands.id, brandId)).limit(1);
  if (!brand) throw AppError.badRequest('Marca informada não existe.');
}

async function assertCategoryExists(categoryId: string): Promise<void> {
  const [category] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, categoryId)).limit(1);
  if (!category) throw AppError.badRequest('Categoria informada não existe.');
}

export async function createProduct(input: ProductInput) {
  if (input.brandId) await assertBrandExists(input.brandId);
  if (input.categoryId) await assertCategoryExists(input.categoryId);
  if (input.warrantyPolicyId) await assertWarrantyPolicyExists(input.warrantyPolicyId);

  const slug = await generateUniqueSlug(input.name, (candidate) => slugExists(candidate));

  const [created] = await db
    .insert(products)
    .values({
      name: input.name,
      slug,
      brandId: input.brandId ?? null,
      categoryId: input.categoryId ?? null,
      warrantyPolicyId: input.warrantyPolicyId || null,
      sku: input.sku ?? null,
      barcode: input.barcode ?? null,
      description: input.description ?? null,
      shortDescription: input.shortDescription ?? null,
      costPrice: input.costPrice !== undefined ? String(input.costPrice) : null,
      sellPrice: String(input.sellPrice),
      salePrice: input.salePrice !== undefined ? String(input.salePrice) : null,
      weight: input.weight !== undefined ? String(input.weight) : null,
      heightCm: input.heightCm !== undefined ? String(input.heightCm) : null,
      widthCm: input.widthCm !== undefined ? String(input.widthCm) : null,
      depthCm: input.depthCm !== undefined ? String(input.depthCm) : null,
      isFeatured: input.isFeatured ?? false,
      isService: input.isService ?? false,
    })
    .returning();

  // Toda venda de produto físico precisa de uma linha de estoque para o
  // módulo de estoque (Etapa 4) funcionar; criamos com quantidade zero.
  // Serviços (isService=true) não têm estoque.
  if (!input.isService) {
    await db.insert(stock).values({ productId: created.id, quantity: 0, minQuantity: 0 });
  }

  return toApiProduct(created);
}

export type UpdateProductInput = Partial<ProductInput> & { isActive?: boolean };

export async function updateProduct(id: string, input: UpdateProductInput) {
  const [existing] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!existing) throw AppError.notFound('Produto não encontrado.');

  if (input.brandId) await assertBrandExists(input.brandId);
  if (input.categoryId) await assertCategoryExists(input.categoryId);
  if (input.warrantyPolicyId) await assertWarrantyPolicyExists(input.warrantyPolicyId);

  const slug = input.name ? await generateUniqueSlug(input.name, (candidate) => slugExists(candidate, id)) : undefined;

  const [updated] = await db
    .update(products)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(slug !== undefined && { slug }),
      ...(input.brandId !== undefined && { brandId: input.brandId }),
      ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
      ...(input.warrantyPolicyId !== undefined && { warrantyPolicyId: input.warrantyPolicyId || null }),
      ...(input.sku !== undefined && { sku: input.sku }),
      ...(input.barcode !== undefined && { barcode: input.barcode }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.shortDescription !== undefined && { shortDescription: input.shortDescription }),
      ...(input.costPrice !== undefined && { costPrice: String(input.costPrice) }),
      ...(input.sellPrice !== undefined && { sellPrice: String(input.sellPrice) }),
      ...(input.salePrice !== undefined && { salePrice: String(input.salePrice) }),
      ...(input.weight !== undefined && { weight: String(input.weight) }),
      ...(input.heightCm !== undefined && { heightCm: String(input.heightCm) }),
      ...(input.widthCm !== undefined && { widthCm: String(input.widthCm) }),
      ...(input.depthCm !== undefined && { depthCm: String(input.depthCm) }),
      ...(input.isFeatured !== undefined && { isFeatured: input.isFeatured }),
      ...(input.isService !== undefined && { isService: input.isService }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      updatedAt: new Date(),
    })
    .where(eq(products.id, id))
    .returning();

  // Se o produto deixou de ser um serviço (ou nunca teve registro de
  // estoque por algum outro motivo), garante que ele exista agora — sem
  // isso, o produto ficaria "preso" sem poder receber movimentação nunca.
  // Não fazemos o inverso (não removemos o estoque se virou serviço): isso
  // apagaria histórico de saldo sem necessidade, e um serviço simplesmente
  // não aparece nas telas que dependem de estoque.
  if (!updated.isService) {
    const [existingStock] = await db.select({ productId: stock.productId }).from(stock).where(eq(stock.productId, id)).limit(1);
    if (!existingStock) {
      await db.insert(stock).values({ productId: id, quantity: 0, minQuantity: 0 });
    }
  }

  return toApiProduct(updated);
}

/** Soft delete: desativa o produto (schema não tem hard delete para catálogo). */
export async function deactivateProduct(id: string) {
  const [existing] = await db.select({ id: products.id }).from(products).where(eq(products.id, id)).limit(1);
  if (!existing) throw AppError.notFound('Produto não encontrado.');

  const [updated] = await db
    .update(products)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();

  return toApiProduct(updated);
}

// ─── Imagens do produto ─────────────────────────────────────────────────────────

export interface AddProductImageInput {
  url: string;
  altText?: string;
  sortOrder?: number;
  isPrimary?: boolean;
}

export async function addProductImage(productId: string, input: AddProductImageInput) {
  const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1);
  if (!product) throw AppError.notFound('Produto não encontrado.');

  if (input.isPrimary) {
    // Garante uma única imagem primária por produto.
    await db
      .update(productImages)
      .set({ isPrimary: false })
      .where(and(eq(productImages.productId, productId), eq(productImages.isPrimary, true)));
  }

  const [image] = await db
    .insert(productImages)
    .values({
      productId,
      url: input.url,
      altText: input.altText ?? null,
      sortOrder: input.sortOrder ?? 0,
      isPrimary: input.isPrimary ?? false,
    })
    .returning();

  return image;
}

/**
 * Recebe o arquivo já decodificado (buffer), sobe pro R2 e registra a
 * imagem no produto — reaproveita addProductImage() pra não duplicar a
 * lógica de "única imagem primária por produto".
 */
export async function uploadProductImage(
  productId: string,
  file: { buffer: Buffer; mimeType: string },
  options: { altText?: string; isPrimary?: boolean } = {},
) {
  const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1);
  if (!product) throw AppError.notFound('Produto não encontrado.');

  const url = await uploadImage({ buffer: file.buffer, mimeType: file.mimeType, folder: `products/${productId}` });

  return addProductImage(productId, { url, altText: options.altText, isPrimary: options.isPrimary });
}

export async function removeProductImage(productId: string, imageId: string) {
  const [image] = await db
    .select({ id: productImages.id, url: productImages.url })
    .from(productImages)
    .where(and(eq(productImages.id, imageId), eq(productImages.productId, productId)))
    .limit(1);

  if (!image) throw AppError.notFound('Imagem não encontrada para este produto.');

  await db.delete(productImages).where(eq(productImages.id, imageId));

  // Best-effort: remove o arquivo do R2 também, se for de lá (não trava a
  // operação principal se o R2 não estiver configurado ou já não existir).
  void deleteImageByUrl(image.url);
}
