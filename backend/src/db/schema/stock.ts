import {
  pgTable, uuid, varchar, boolean, timestamp, text, numeric, integer,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { products } from './catalog';
import { users } from './users';
import { stockMovementTypeEnum } from './enums';

// ─── Fornecedores ─────────────────────────────────────────────────────────────
export const suppliers = pgTable('suppliers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  tradeName: varchar('trade_name', { length: 255 }),
  document: varchar('document', { length: 20 }), // CNPJ
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  website: text('website'),
  contactName: varchar('contact_name', { length: 255 }),
  notes: text('notes'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Estoque ──────────────────────────────────────────────────────────────────
export const stock = pgTable('stock', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' })
    .unique(),
  quantity: integer('quantity').notNull().default(0),
  minQuantity: integer('min_quantity').notNull().default(0),  // Estoque mínimo
  maxQuantity: integer('max_quantity'),                        // Estoque máximo
  location: varchar('location', { length: 100 }),             // Localização física
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Movimentações de estoque ─────────────────────────────────────────────────
export const stockMovements = pgTable('stock_movements', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'restrict' }),
  supplierId: uuid('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }), // quem registrou
  type: stockMovementTypeEnum('type').notNull(),
  quantity: integer('quantity').notNull(),
  previousQuantity: integer('previous_quantity').notNull(),
  newQuantity: integer('new_quantity').notNull(),
  unitCost: numeric('unit_cost', { precision: 12, scale: 2 }),
  reference: varchar('reference', { length: 100 }), // NF, OS, pedido
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Relações ─────────────────────────────────────────────────────────────────
export const stockRelations = relations(stock, ({ one }) => ({
  product: one(products, { fields: [stock.productId], references: [products.id] }),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, { fields: [stockMovements.productId], references: [products.id] }),
  supplier: one(suppliers, { fields: [stockMovements.supplierId], references: [suppliers.id] }),
  user: one(users, { fields: [stockMovements.userId], references: [users.id] }),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  stockMovements: many(stockMovements),
}));
