import {
  pgTable, uuid, varchar, timestamp, text, numeric, jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { orders } from './commerce';
import { serviceOrders } from './service-orders';
import { paymentStatusEnum, paymentMethodEnum } from './enums';

// ─── Histórico de pagamentos ──────────────────────────────────────────────────
// Registra todas as tentativas e confirmações de pagamento
export const paymentHistory = pgTable('payment_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
  serviceOrderId: uuid('service_order_id').references(() => serviceOrders.id, { onDelete: 'set null' }),
  method: paymentMethodEnum('method').notNull(),
  status: paymentStatusEnum('status').notNull().default('pending'),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  // Dados do gateway de pagamento
  gatewayName: varchar('gateway_name', { length: 100 }), // Ex: 'stripe', 'mercadopago'
  gatewayTransactionId: varchar('gateway_transaction_id', { length: 255 }),
  gatewayResponse: jsonb('gateway_response'),             // Resposta bruta do gateway
  pixKey: varchar('pix_key', { length: 255 }),
  pixQrCode: text('pix_qr_code'),
  boletoUrl: text('boleto_url'),
  boletoBarcode: varchar('boleto_barcode', { length: 100 }),
  boletoExpiresAt: timestamp('boleto_expires_at', { withTimezone: true }),
  installments: varchar('installments', { length: 10 }),  // Ex: '1x', '12x'
  notes: text('notes'),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  refundedAt: timestamp('refunded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Relações ─────────────────────────────────────────────────────────────────
export const paymentHistoryRelations = relations(paymentHistory, ({ one }) => ({
  order: one(orders, { fields: [paymentHistory.orderId], references: [orders.id] }),
  serviceOrder: one(serviceOrders, {
    fields: [paymentHistory.serviceOrderId],
    references: [serviceOrders.id],
  }),
}));
