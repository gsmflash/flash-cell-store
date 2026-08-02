import { and, desc, eq, gte, ilike, lte, count, sql } from 'drizzle-orm';
import { db } from '../db/index';
import { orders, orderItems, carts, cartItems, products } from '../db/schema/index';
import { AppError } from '../lib/appError';
import { toOffset, type PaginationQuery } from '../lib/pagination';
import { formatOrderNumber, extractOrderSequenceForYear } from '../lib/orderNumber';
import { canCancelOrder, type OrderStatus } from '../lib/orderCancellation';
import { registerMovementInTx, type DbTransaction } from './stock.service';
import { validateCouponForOrder, incrementCouponUsage } from './coupons.service';
import { assertAddressBelongsToCustomer } from './addresses.service';
import { logAction } from '../lib/logger';
import { createWarrantiesForOrder } from './warranties.service';

function toApiOrder<T extends { subtotal: string; discountAmount: string; shippingCost: string; total: string }>(row: T) {
  return {
    ...row,
    subtotal: Number(row.subtotal),
    discountAmount: Number(row.discountAmount),
    shippingCost: Number(row.shippingCost),
    total: Number(row.total),
  };
}

async function generateOrderNumber(tx: DbTransaction): Promise<string> {
  const year = new Date().getFullYear();
  // Advisory lock escopado à transação, mesma técnica usada para o número
  // da OS (lib/service-orders): serializa criações concorrentes de pedido.
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${'flash-cell-order-number-' + year}))`);

  const rows = await tx.select({ number: orders.number }).from(orders).where(ilike(orders.number, `PED-${year}-%`));

  let maxSequence = 0;
  for (const row of rows) {
    const sequence = extractOrderSequenceForYear(row.number, year);
    if (sequence !== null && sequence > maxSequence) maxSequence = sequence;
  }

  return formatOrderNumber(year, maxSequence + 1);
}

export interface ListOrdersParams extends PaginationQuery {
  status?: OrderStatus;
  customerId?: string;
  from?: Date;
  to?: Date;
}

export async function listOrders(params: ListOrdersParams) {
  const { page, perPage, status, customerId, from, to } = params;

  const conditions = [
    ...(status ? [eq(orders.status, status)] : []),
    ...(customerId ? [eq(orders.customerId, customerId)] : []),
    ...(from ? [gte(orders.createdAt, from)] : []),
    ...(to ? [lte(orders.createdAt, to)] : []),
  ];
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, [{ total }]] = await Promise.all([
    db.select().from(orders).where(whereClause).orderBy(desc(orders.createdAt)).limit(perPage).offset(toOffset(page, perPage)),
    db.select({ total: count() }).from(orders).where(whereClause),
  ]);

  return { items: items.map(toApiOrder), total };
}

async function getOrderItemsFor(orderId: string) {
  const rows = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  return rows.map((row) => ({ ...row, unitPrice: Number(row.unitPrice), discount: Number(row.discount), total: Number(row.total) }));
}

/**
 * Busca o pedido pelo id. Se `ownerCustomerId` for informado, só retorna o
 * pedido se pertencer a esse cliente (usado quando quem pede é o próprio
 * cliente, não um membro da equipe) — 404 em vez de 403 para não confirmar
 * a existência do pedido a quem não é o dono.
 */
export async function getOrderById(id: string, ownerCustomerId?: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order || (ownerCustomerId && order.customerId !== ownerCustomerId)) {
    throw AppError.notFound('Pedido não encontrado.');
  }

  const items = await getOrderItemsFor(id);
  return { ...toApiOrder(order), items };
}

export interface CreateOrderInput {
  customerId: string;
  addressId?: string;
  couponCode?: string;
  notes?: string;
}

/**
 * Cria um pedido a partir do carrinho atual do cliente: valida cupom (se
 * houver), calcula totais, dá baixa de estoque item a item e limpa o
 * carrinho — tudo na mesma transação. Se qualquer item não tiver estoque
 * suficiente, o pedido inteiro é revertido (nenhum item fica "pela metade").
 */
export async function createOrderFromCart(userId: string, input: CreateOrderInput) {
  if (input.addressId) await assertAddressBelongsToCustomer(input.customerId, input.addressId);

  const result = await db.transaction(async (tx) => {
    const [cart] = await tx.select().from(carts).where(eq(carts.customerId, input.customerId)).limit(1);
    if (!cart) throw AppError.badRequest('Carrinho vazio.');

    const rawItems = await tx
      .select({
        productId: cartItems.productId,
        quantity: cartItems.quantity,
        productName: products.name,
        productSku: products.sku,
        sellPrice: products.sellPrice,
        salePrice: products.salePrice,
        isActive: products.isActive,
      })
      .from(cartItems)
      .innerJoin(products, eq(products.id, cartItems.productId))
      .where(eq(cartItems.cartId, cart.id));

    if (rawItems.length === 0) throw AppError.badRequest('Carrinho vazio.');

    const inactiveItem = rawItems.find((item) => !item.isActive);
    if (inactiveItem) {
      throw AppError.conflict(`O produto "${inactiveItem.productName}" não está mais disponível. Remova-o do carrinho.`);
    }

    const priced = rawItems.map((item) => {
      const unitPrice =
        item.salePrice !== null && Number(item.salePrice) < Number(item.sellPrice) ? Number(item.salePrice) : Number(item.sellPrice);
      return { ...item, unitPrice, lineTotal: unitPrice * item.quantity };
    });

    const subtotal = priced.reduce((sum, item) => sum + item.lineTotal, 0);

    let discountAmount = 0;
    let couponId: string | null = null;
    if (input.couponCode) {
      const couponResult = await validateCouponForOrder(tx, input.couponCode, subtotal, input.customerId);
      couponId = couponResult.couponId;
      discountAmount = couponResult.discountAmount;
    }

    // Cálculo de frete fica para uma etapa futura (não implementado ainda) — sempre 0 por ora.
    const shippingCost = 0;
    const total = subtotal - discountAmount + shippingCost;

    const number = await generateOrderNumber(tx);

    const [order] = await tx
      .insert(orders)
      .values({
        number,
        customerId: input.customerId,
        addressId: input.addressId ?? null,
        couponId,
        status: 'pending',
        subtotal: String(subtotal),
        discountAmount: String(discountAmount),
        shippingCost: String(shippingCost),
        total: String(total),
        notes: input.notes ?? null,
      })
      .returning();

    for (const item of priced) {
      await tx.insert(orderItems).values({
        orderId: order.id,
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        quantity: item.quantity,
        unitPrice: String(item.unitPrice),
        discount: '0',
        total: String(item.lineTotal),
      });

      // Se o estoque for insuficiente, isso lança e reverte a transação
      // inteira — o pedido não fica "meio criado".
      await registerMovementInTx(tx, userId, {
        productId: item.productId,
        type: 'out',
        quantity: item.quantity,
        reference: number,
        notes: `Pedido ${number}`,
      });
    }

    if (couponId) await incrementCouponUsage(tx, couponId);

    await tx.delete(cartItems).where(eq(cartItems.cartId, cart.id));

    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    return { ...toApiOrder(order), items: items.map((i) => ({ ...i, unitPrice: Number(i.unitPrice), discount: Number(i.discount), total: Number(i.total) })) };
  });

  // Logado depois que a transação já commitou — só registra o que realmente aconteceu.
  void logAction({
    userId,
    action: 'order.created',
    entity: 'order',
    entityId: result.id,
    message: `Pedido ${result.number} criado (total ${result.total}).`,
  });

  return result;
}

/**
 * Avança o status do pedido (uso administrativo). Não aceita 'cancelled' nem
 * 'refunded' aqui — cancelamento tem fluxo próprio (reverte estoque); reembolso
 * ainda não existe (Etapa 9). Não valida uma máquina de estados rígida como a
 * das OS: dá liberdade para o admin corrigir manualmente se precisar.
 */
export async function updateOrderStatus(id: string, status: Exclude<OrderStatus, 'cancelled' | 'refunded' | 'pending'>) {
  const [existing] = await db.select({ id: orders.id, customerId: orders.customerId }).from(orders).where(eq(orders.id, id)).limit(1);
  if (!existing) throw AppError.notFound('Pedido não encontrado.');

  const [updated] = await db.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, id)).returning();

  if (status === 'delivered') {
    void createWarrantiesForOrder(id, existing.customerId);
  }

  return toApiOrder(updated);
}

/**
 * Cancela um pedido e reverte o estoque de cada item (tipo `return`). Só
 * permitido antes do pedido ser enviado (ver lib/orderCancellation.ts).
 */
export async function cancelOrder(userId: string, id: string, reason: string | undefined, ownerCustomerId?: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order || (ownerCustomerId && order.customerId !== ownerCustomerId)) {
    throw AppError.notFound('Pedido não encontrado.');
  }

  if (!canCancelOrder(order.status as OrderStatus)) {
    throw AppError.conflict(`Pedido no status "${order.status}" não pode mais ser cancelado.`);
  }

  const updatedOrder = await db.transaction(async (tx) => {
    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, id));

    for (const item of items) {
      if (!item.productId) continue; // produto pode ter sido removido do catálogo depois da compra
      await registerMovementInTx(tx, userId, {
        productId: item.productId,
        type: 'return',
        quantity: item.quantity,
        reference: order.number,
        notes: `Cancelamento do pedido ${order.number}`,
      });
    }

    const [updated] = await tx
      .update(orders)
      .set({ status: 'cancelled', cancelledAt: new Date(), cancellationReason: reason ?? null, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();

    return toApiOrder(updated);
  });

  void logAction({
    userId,
    action: 'order.cancelled',
    entity: 'order',
    entityId: id,
    message: `Pedido ${order.number} cancelado.${reason ? ` Motivo: ${reason}` : ''}`,
  });

  return updatedOrder;
}
