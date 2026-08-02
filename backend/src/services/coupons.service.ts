import { and, asc, count, eq, sql } from 'drizzle-orm';
import { db } from '../db/index';
import { coupons, orders } from '../db/schema/index';
import { AppError } from '../lib/appError';
import { toOffset, type PaginationQuery } from '../lib/pagination';
import { computeCouponDiscount } from '../lib/couponDiscount';
import type { DbTransaction } from './stock.service';

function toApiCoupon<T extends { value: string; minOrderValue: string | null; maxDiscount: string | null }>(row: T) {
  return {
    ...row,
    value: Number(row.value),
    minOrderValue: row.minOrderValue !== null ? Number(row.minOrderValue) : null,
    maxDiscount: row.maxDiscount !== null ? Number(row.maxDiscount) : null,
  };
}

export interface ListCouponsParams extends PaginationQuery {
  includeInactive?: boolean;
}

export async function listCoupons(params: ListCouponsParams) {
  const { page, perPage, includeInactive } = params;
  const whereClause = includeInactive ? undefined : eq(coupons.isActive, true);

  const [items, [{ total }]] = await Promise.all([
    db.select().from(coupons).where(whereClause).orderBy(asc(coupons.code)).limit(perPage).offset(toOffset(page, perPage)),
    db.select({ total: count() }).from(coupons).where(whereClause),
  ]);

  return { items: items.map(toApiCoupon), total };
}

export async function getCouponById(id: string) {
  const [row] = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
  if (!row) throw AppError.notFound('Cupom não encontrado.');
  return toApiCoupon(row);
}

export interface CouponInput {
  code: string;
  description?: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderValue?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usageLimitPerUser?: number;
  startsAt?: Date;
  expiresAt?: Date;
}

export async function createCoupon(input: CouponInput) {
  const [existing] = await db.select({ id: coupons.id }).from(coupons).where(eq(coupons.code, input.code.toUpperCase())).limit(1);
  if (existing) throw AppError.conflict('Já existe um cupom com este código.');

  const [created] = await db
    .insert(coupons)
    .values({
      code: input.code.toUpperCase(),
      description: input.description ?? null,
      type: input.type,
      value: String(input.value),
      minOrderValue: input.minOrderValue !== undefined ? String(input.minOrderValue) : null,
      maxDiscount: input.maxDiscount !== undefined ? String(input.maxDiscount) : null,
      usageLimit: input.usageLimit ?? null,
      usageLimitPerUser: input.usageLimitPerUser ?? 1,
      startsAt: input.startsAt ?? null,
      expiresAt: input.expiresAt ?? null,
    })
    .returning();

  return toApiCoupon(created);
}

export type UpdateCouponInput = Partial<CouponInput> & { isActive?: boolean };

export async function updateCoupon(id: string, input: UpdateCouponInput) {
  await getCouponById(id);
  const [updated] = await db
    .update(coupons)
    .set({
      ...(input.description !== undefined && { description: input.description }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.value !== undefined && { value: String(input.value) }),
      ...(input.minOrderValue !== undefined && { minOrderValue: String(input.minOrderValue) }),
      ...(input.maxDiscount !== undefined && { maxDiscount: String(input.maxDiscount) }),
      ...(input.usageLimit !== undefined && { usageLimit: input.usageLimit }),
      ...(input.usageLimitPerUser !== undefined && { usageLimitPerUser: input.usageLimitPerUser }),
      ...(input.startsAt !== undefined && { startsAt: input.startsAt }),
      ...(input.expiresAt !== undefined && { expiresAt: input.expiresAt }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      updatedAt: new Date(),
    })
    .where(eq(coupons.id, id))
    .returning();
  return toApiCoupon(updated);
}

export async function deactivateCoupon(id: string) {
  await getCouponById(id);
  const [updated] = await db.update(coupons).set({ isActive: false, updatedAt: new Date() }).where(eq(coupons.id, id)).returning();
  return toApiCoupon(updated);
}

/**
 * Valida um cupom para uso em um pedido e retorna o desconto calculado.
 * Roda dentro da transação do checkout (tx) para que o incremento de
 * usageCount logo depois seja atômico com a criação do pedido.
 */
export async function validateCouponForOrder(
  tx: DbTransaction,
  code: string,
  subtotal: number,
  customerId: string,
): Promise<{ couponId: string; discountAmount: number }> {
  const [coupon] = await tx.select().from(coupons).where(eq(coupons.code, code.toUpperCase())).limit(1);

  if (!coupon || !coupon.isActive) {
    throw AppError.badRequest('Cupom inválido.');
  }

  const now = new Date();
  if (coupon.startsAt && now < coupon.startsAt) {
    throw AppError.badRequest('Este cupom ainda não está válido.');
  }
  if (coupon.expiresAt && now > coupon.expiresAt) {
    throw AppError.badRequest('Este cupom expirou.');
  }

  const minOrderValue = coupon.minOrderValue !== null ? Number(coupon.minOrderValue) : null;
  if (minOrderValue !== null && subtotal < minOrderValue) {
    throw AppError.badRequest(`Este cupom exige um pedido mínimo de ${minOrderValue}.`);
  }

  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    throw AppError.badRequest('Este cupom atingiu o limite total de usos.');
  }

  if (coupon.usageLimitPerUser !== null) {
    const [{ usedByCustomer }] = await tx
      .select({ usedByCustomer: count() })
      .from(orders)
      .where(and(eq(orders.couponId, coupon.id), eq(orders.customerId, customerId)));

    if (usedByCustomer >= coupon.usageLimitPerUser) {
      throw AppError.badRequest('Você já utilizou este cupom o número máximo de vezes permitido.');
    }
  }

  const discountAmount = computeCouponDiscount(
    {
      type: coupon.type,
      value: Number(coupon.value),
      maxDiscount: coupon.maxDiscount !== null ? Number(coupon.maxDiscount) : null,
    },
    subtotal,
  );

  return { couponId: coupon.id, discountAmount };
}

/**
 * Mesma validação de validateCouponForOrder, mas de leitura (usa `db`, não
 * uma transação) — para o checkout mostrar uma prévia do desconto antes de
 * de fato finalizar o pedido. Não incrementa usageCount.
 */
export async function previewCoupon(code: string, subtotal: number, customerId: string) {
  const [coupon] = await db.select().from(coupons).where(eq(coupons.code, code.toUpperCase())).limit(1);

  if (!coupon || !coupon.isActive) {
    throw AppError.badRequest('Cupom inválido.');
  }

  const now = new Date();
  if (coupon.startsAt && now < coupon.startsAt) throw AppError.badRequest('Este cupom ainda não está válido.');
  if (coupon.expiresAt && now > coupon.expiresAt) throw AppError.badRequest('Este cupom expirou.');

  const minOrderValue = coupon.minOrderValue !== null ? Number(coupon.minOrderValue) : null;
  if (minOrderValue !== null && subtotal < minOrderValue) {
    throw AppError.badRequest(`Este cupom exige um pedido mínimo de ${minOrderValue}.`);
  }

  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    throw AppError.badRequest('Este cupom atingiu o limite total de usos.');
  }

  if (coupon.usageLimitPerUser !== null) {
    const [{ usedByCustomer }] = await db
      .select({ usedByCustomer: count() })
      .from(orders)
      .where(and(eq(orders.couponId, coupon.id), eq(orders.customerId, customerId)));

    if (usedByCustomer >= coupon.usageLimitPerUser) {
      throw AppError.badRequest('Você já utilizou este cupom o número máximo de vezes permitido.');
    }
  }

  const discountAmount = computeCouponDiscount(
    {
      type: coupon.type,
      value: Number(coupon.value),
      maxDiscount: coupon.maxDiscount !== null ? Number(coupon.maxDiscount) : null,
    },
    subtotal,
  );

  return { code: coupon.code, discountAmount };
}

/** Incrementa o contador de uso do cupom — chamar após confirmar o pedido, na mesma transação. */
export async function incrementCouponUsage(tx: DbTransaction, couponId: string): Promise<void> {
  await tx.update(coupons).set({ usageCount: sql`${coupons.usageCount} + 1` }).where(eq(coupons.id, couponId));
}
