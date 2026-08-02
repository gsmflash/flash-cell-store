import { eq } from 'drizzle-orm';
import { db } from '../db/index';
import { paymentHistory, orders, orderItems, customers } from '../db/schema/index';
import { AppError } from '../lib/appError';
import { logAction } from '../lib/logger';
import { mapMercadoPagoStatus } from '../lib/paymentStatus';
import {
  createPixPayment,
  createPaymentPreference,
  getPayment,
  refundPayment as mpRefundPayment,
} from '../lib/mercadopago';

function toApiPayment<T extends { amount: string }>(row: T) {
  return { ...row, amount: Number(row.amount) };
}

async function getOrderForCheckout(orderId: string, customerId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.customerId !== customerId) throw AppError.notFound('Pedido não encontrado.');
  if (order.status !== 'pending') {
    throw AppError.conflict(`Pedido no status "${order.status}" não está aguardando pagamento.`);
  }
  return order;
}

/** Cria uma cobrança PIX para o pedido e retorna o QR code para exibir ao cliente. */
export async function createPixCheckout(orderId: string, customerId: string) {
  const order = await getOrderForCheckout(orderId, customerId);
  const [customer] = await db.select({ email: customers.email }).from(customers).where(eq(customers.id, customerId)).limit(1);

  const payerEmail = customer?.email ?? 'cliente@flashcell.com.br';

  const pix = await createPixPayment({
    amount: Number(order.total),
    description: `Pedido ${order.number} — Flash Cell Store`,
    externalReference: order.number,
    payerEmail,
  });

  const [record] = await db
    .insert(paymentHistory)
    .values({
      orderId: order.id,
      method: 'pix',
      status: 'pending',
      amount: String(order.total),
      gatewayName: 'mercadopago',
      gatewayTransactionId: pix.id,
      pixQrCode: pix.qrCode,
    })
    .returning();

  return {
    paymentId: record.id,
    qrCode: pix.qrCode,
    qrCodeBase64: pix.qrCodeBase64,
    expiresAt: pix.expiresAt,
  };
}

/** Cria uma preferência de Checkout Pro (cartão/boleto) e retorna a URL de redirecionamento. */
export async function createCardCheckout(orderId: string, customerId: string) {
  const order = await getOrderForCheckout(orderId, customerId);
  const [customer] = await db.select({ email: customers.email }).from(customers).where(eq(customers.id, customerId)).limit(1);
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));

  const payerEmail = customer?.email ?? 'cliente@flashcell.com.br';

  const preference = await createPaymentPreference({
    orderNumber: order.number,
    payerEmail,
    items: items.map((item) => ({ title: item.productName, quantity: item.quantity, unitPrice: Number(item.unitPrice) })),
  });

  const [record] = await db
    .insert(paymentHistory)
    .values({
      orderId: order.id,
      method: 'credit_card',
      status: 'pending',
      amount: String(order.total),
      gatewayName: 'mercadopago',
      gatewayTransactionId: preference.id,
    })
    .returning();

  return { paymentId: record.id, checkoutUrl: preference.initPoint };
}

export async function listPaymentsForOrder(orderId: string) {
  const rows = await db.select().from(paymentHistory).where(eq(paymentHistory.orderId, orderId));
  return rows.map(toApiPayment);
}

/**
 * Processa a notificação de webhook do Mercado Pago. Sempre busca o
 * pagamento de novo na API do MP (nunca confia cegamente no payload do
 * webhook) antes de atualizar qualquer coisa — é a prática recomendada pela
 * própria documentação do Mercado Pago, já que qualquer um pode enviar um
 * POST pro endpoint do webhook.
 */
export async function handlePaymentWebhook(mercadoPagoPaymentId: string): Promise<void> {
  const payment = await getPayment(mercadoPagoPaymentId);

  const [record] = await db
    .select()
    .from(paymentHistory)
    .where(eq(paymentHistory.gatewayTransactionId, mercadoPagoPaymentId))
    .limit(1);

  if (!record) {
    // Notificação de um pagamento que não reconhecemos — ignora silenciosamente
    // (pode ser de outro ambiente/integração usando a mesma conta MP).
    return;
  }

  const newStatus = mapMercadoPagoStatus(payment.status);

  await db
    .update(paymentHistory)
    .set({
      status: newStatus,
      gatewayResponse: payment as unknown as Record<string, unknown>,
      ...(newStatus === 'paid' && { paidAt: new Date() }),
      ...(newStatus === 'refunded' && { refundedAt: new Date() }),
      updatedAt: new Date(),
    })
    .where(eq(paymentHistory.id, record.id));

  if (record.orderId && newStatus === 'paid') {
    await db.update(orders).set({ status: 'confirmed', updatedAt: new Date() }).where(eq(orders.id, record.orderId));
    void logAction({
      action: 'payment.confirmed',
      entity: 'order',
      entityId: record.orderId,
      message: `Pagamento confirmado via Mercado Pago (${payment.id}).`,
    });
  }
}

/** Reembolsa um pagamento já aprovado (uso administrativo). */
export async function refundOrderPayment(userId: string, paymentId: string) {
  const [record] = await db.select().from(paymentHistory).where(eq(paymentHistory.id, paymentId)).limit(1);
  if (!record) throw AppError.notFound('Pagamento não encontrado.');
  if (record.status !== 'paid') throw AppError.conflict('Só é possível reembolsar um pagamento já confirmado.');
  if (!record.gatewayTransactionId) throw AppError.conflict('Pagamento sem referência no gateway — não é possível reembolsar automaticamente.');

  await mpRefundPayment(record.gatewayTransactionId);

  const [updated] = await db
    .update(paymentHistory)
    .set({ status: 'refunded', refundedAt: new Date(), updatedAt: new Date() })
    .where(eq(paymentHistory.id, paymentId))
    .returning();

  if (record.orderId) {
    await db.update(orders).set({ status: 'refunded', updatedAt: new Date() }).where(eq(orders.id, record.orderId));
  }

  void logAction({
    userId,
    action: 'payment.refunded',
    entity: 'payment',
    entityId: paymentId,
    message: `Pagamento ${paymentId} reembolsado.`,
  });

  return toApiPayment(updated);
}
