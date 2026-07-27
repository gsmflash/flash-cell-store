import {
  pgTable, uuid, varchar, boolean, timestamp, text, numeric, integer,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { customers } from './customers';
import { addresses } from './customers';
import { products } from './catalog';
import { orderStatusEnum, couponTypeEnum } from './enums';

// ─── Cupons de desconto ───────────────────────────────────────────────────────
export const coupons = pgTable('coupons', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  description: text('description'),
  type: couponTypeEnum('type').notNull(),
  value: numeric('value', { precision: 12, scale: 2 }).notNull(), // % ou R$
  minOrderValue: numeric('min_order_value', { precision: 12, scale: 2 }),
  maxDiscount: numeric('max_discount', { precision: 12, scale: 2 }),
  usageLimit: integer('usage_limit'),                 // Total de usos permitidos
  usageCount: integer('usage_count').notNull().default(0),
  usageLimitPerUser: integer('usage_limit_per_user').default(1),
  isActive: boolean('is_active').notNull().default(true),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Pedidos ──────────────────────────────────────────────────────────────────
export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  number: varchar('number', { length: 20 }).notNull().unique(), // Ex: PED-2024-0001
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'restrict' }),
  addressId: uuid('address_id').references(() => addresses.id, { onDelete: 'set null' }),
  couponId: uuid('coupon_id').references(() => coupons.id, { onDelete: 'set null' }),
  status: orderStatusEnum('status').notNull().default('pending'),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
  discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  shippingCost: numeric('shipping_cost', { precision: 12, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  notes: text('notes'),
  trackingCode: varchar('tracking_code', { length: 100 }),
  shippedAt: timestamp('shipped_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancellationReason: text('cancellation_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Itens do pedido ──────────────────────────────────────────────────────────
export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  productName: varchar('product_name', { length: 255 }).notNull(), // snapshot
  productSku: varchar('product_sku', { length: 100 }),
  quantity: integer('quantity').notNull(),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
  discount: numeric('discount', { precision: 12, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Carrinho ─────────────────────────────────────────────────────────────────
export const carts = pgTable('carts', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
  sessionId: varchar('session_id', { length: 255 }), // Para usuários anônimos
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Itens do carrinho ────────────────────────────────────────────────────────
export const cartItems = pgTable('cart_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  cartId: uuid('cart_id')
    .notNull()
    .references(() => carts.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull().default(1),
  addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Favoritos / Wishlist ─────────────────────────────────────────────────────
export const favorites = pgTable('favorites', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Relações ─────────────────────────────────────────────────────────────────
export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  address: one(addresses, { fields: [orders.addressId], references: [addresses.id] }),
  coupon: one(coupons, { fields: [orders.couponId], references: [coupons.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

export const cartsRelations = relations(carts, ({ one, many }) => ({
  customer: one(customers, { fields: [carts.customerId], references: [customers.id] }),
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  product: one(products, { fields: [cartItems.productId], references: [products.id] }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  customer: one(customers, { fields: [favorites.customerId], references: [customers.id] }),
  product: one(products, { fields: [favorites.productId], references: [products.id] }),
}));

export const couponsRelations = relations(coupons, ({ many }) => ({
  orders: many(orders),
}));
