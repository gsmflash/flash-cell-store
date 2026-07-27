import { pgTable, uuid, varchar, boolean, timestamp, text, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { customers } from './customers';
import { products } from './catalog';
import { serviceOrders } from './service-orders';
import { warrantyTypeEnum } from './enums';

// ─── Garantias ────────────────────────────────────────────────────────────────
export const warranties = pgTable('warranties', {
  id: uuid('id').defaultRandom().primaryKey(),
  serviceOrderId: uuid('service_order_id').references(() => serviceOrders.id, { onDelete: 'set null' }),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'restrict' }),
  type: warrantyTypeEnum('type').notNull().default('service'),
  description: text('description').notNull(),
  termsAndConditions: text('terms_and_conditions'),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  voidedReason: text('voided_reason'),
  voidedAt: timestamp('voided_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Relações ─────────────────────────────────────────────────────────────────
export const warrantiesRelations = relations(warranties, ({ one }) => ({
  serviceOrder: one(serviceOrders, { fields: [warranties.serviceOrderId], references: [serviceOrders.id] }),
  product: one(products, { fields: [warranties.productId], references: [products.id] }),
  customer: one(customers, { fields: [warranties.customerId], references: [customers.id] }),
}));
