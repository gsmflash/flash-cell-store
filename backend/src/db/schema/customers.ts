import { pgTable, uuid, varchar, boolean, timestamp, text } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { addressTypeEnum, documentTypeEnum } from './enums';

// ─── Clientes ────────────────────────────────────────────────────────────────
// Um cliente pode ter ou não uma conta de usuário (atendimentos balcão)
export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  whatsapp: varchar('whatsapp', { length: 20 }),
  document: varchar('document', { length: 20 }),
  documentType: documentTypeEnum('document_type'),
  birthDate: text('birth_date'), // stored as ISO string for flexibility
  notes: text('notes'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Endereços ────────────────────────────────────────────────────────────────
export const addresses = pgTable('addresses', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  label: varchar('label', { length: 100 }), // Ex: "Casa", "Trabalho"
  type: addressTypeEnum('type').notNull().default('residential'),
  zipCode: varchar('zip_code', { length: 10 }).notNull(),
  street: varchar('street', { length: 255 }).notNull(),
  number: varchar('number', { length: 20 }).notNull(),
  complement: varchar('complement', { length: 100 }),
  neighborhood: varchar('neighborhood', { length: 100 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 2 }).notNull(),
  country: varchar('country', { length: 2 }).notNull().default('BR'),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Relações ─────────────────────────────────────────────────────────────────
export const customersRelations = relations(customers, ({ one, many }) => ({
  user: one(users, { fields: [customers.userId], references: [users.id] }),
  addresses: many(addresses),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  customer: one(customers, { fields: [addresses.customerId], references: [customers.id] }),
}));
