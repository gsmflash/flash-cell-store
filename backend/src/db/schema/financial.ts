import { pgTable, uuid, numeric, timestamp, text, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { serviceOrders } from './service-orders';
import { customers } from './customers';
import { users } from './users';
import { paymentMethodEnum, receivableStatusEnum } from './enums';

// ─── Histórico de pagamentos ────────────────────────────────────────────────────
// Registra TODO pagamento feito numa OS, mesmo os que quitam o valor na
// hora (sem nunca gerar uma conta a receber). É a fonte de verdade pra
// "quanto já foi recebido" — accounts_receivable.receivedAmount é um cache
// derivado disso, recalculado a cada novo pagamento.
export const paymentRecords = pgTable('payment_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  serviceOrderId: uuid('service_order_id')
    .notNull()
    .references(() => serviceOrders.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  method: paymentMethodEnum('method').notNull(),
  // Troco — só relevante quando o valor pago (ex.: dinheiro) é maior que o
  // saldo devedor no momento desse pagamento específico.
  changeAmount: numeric('change_amount', { precision: 12, scale: 2 }),
  paidAt: timestamp('paid_at', { withTimezone: true }).notNull().defaultNow(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Contas a receber ────────────────────────────────────────────────────────────
// Só existe (é criada) quando sobra saldo devedor após um pagamento. Fica
// com status 'paid' depois de quitada (não é apagada) — serve de histórico
// e é a peça que o futuro módulo Financeiro (contas a pagar, fluxo de
// caixa, DRE, conciliação) vai consumir sem precisar de nenhuma mudança de
// estrutura aqui.
//
// `originType` existe de propósito pra permitir, no futuro, contas a
// receber vindas de outras origens (pedido de loja, lançamento manual)
// sem precisar alterar esta tabela — hoje só usamos 'service_order'.
export const accountsReceivable = pgTable('accounts_receivable', {
  id: uuid('id').defaultRandom().primaryKey(),
  originType: text('origin_type').notNull().default('service_order'),
  serviceOrderId: uuid('service_order_id').references(() => serviceOrders.id, { onDelete: 'set null' }),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'restrict' }),
  originalAmount: numeric('original_amount', { precision: 12, scale: 2 }).notNull(),
  receivedAmount: numeric('received_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  remainingAmount: numeric('remaining_amount', { precision: 12, scale: 2 }).notNull(),
  status: receivableStatusEnum('status').notNull().default('pending'),
  dueDate: date('due_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const paymentRecordsRelations = relations(paymentRecords, ({ one }) => ({
  serviceOrder: one(serviceOrders, { fields: [paymentRecords.serviceOrderId], references: [serviceOrders.id] }),
  user: one(users, { fields: [paymentRecords.userId], references: [users.id] }),
}));

export const accountsReceivableRelations = relations(accountsReceivable, ({ one }) => ({
  serviceOrder: one(serviceOrders, { fields: [accountsReceivable.serviceOrderId], references: [serviceOrders.id] }),
  customer: one(customers, { fields: [accountsReceivable.customerId], references: [customers.id] }),
}));
