import {
  pgTable, uuid, varchar, boolean, timestamp, text, numeric, integer, jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { customers } from './customers';
import { products } from './catalog';
import { serviceOrderStatusEnum, deviceTypeEnum, discountTypeEnum, receivableStatusEnum } from './enums';

// ─── Técnicos ─────────────────────────────────────────────────────────────────
export const technicians = pgTable('technicians', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' })
    .unique(),
  specialties: text('specialties').array(), // Ex: ['smartphone', 'tablet']
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Defeitos (catálogo) ──────────────────────────────────────────────────────
export const defects = pgTable('defects', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  deviceType: deviceTypeEnum('device_type'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Catálogo de serviços ─────────────────────────────────────────────────────
export const servicesCatalog = pgTable('services_catalog', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  estimatedMinutes: integer('estimated_minutes'),
  deviceType: deviceTypeEnum('device_type'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Ordens de serviço ────────────────────────────────────────────────────────
export const serviceOrders = pgTable('service_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  number: varchar('number', { length: 20 }).notNull().unique(), // Ex: OS-2024-0001
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'restrict' }),
  technicianId: uuid('technician_id').references(() => technicians.id, { onDelete: 'set null' }),
  status: serviceOrderStatusEnum('status').notNull().default('received'),
  // Dados do aparelho
  deviceType: deviceTypeEnum('device_type').notNull(),
  deviceBrand: varchar('device_brand', { length: 100 }).notNull(),
  deviceModel: varchar('device_model', { length: 100 }).notNull(),
  deviceColor: varchar('device_color', { length: 50 }),
  deviceImei: varchar('device_imei', { length: 20 }),
  deviceImei2: varchar('device_imei2', { length: 20 }),
  deviceSerial: varchar('device_serial', { length: 100 }),
  devicePassword: varchar('device_password', { length: 100 }), // Senha de desbloqueio
  // Financeiro
  estimatedValue: numeric('estimated_value', { precision: 12, scale: 2 }),
  // Valor total antes do desconto (soma de serviços + peças, "congelada"
  // no momento da finalização — não recalculada depois, pra manter o
  // histórico fiel ao que foi acordado com o cliente).
  subtotalValue: numeric('subtotal_value', { precision: 12, scale: 2 }),
  discount: numeric('discount', { precision: 12, scale: 2 }).default('0'),
  discountType: discountTypeEnum('discount_type'),
  finalValue: numeric('final_value', { precision: 12, scale: 2 }),
  // Cache/resumo — a fonte de verdade de quanto já foi pago está em
  // payment_records; este campo existe só pra listar/filtrar OS rapidamente
  // sem precisar somar pagamentos toda vez. Recalculado a cada pagamento.
  financialStatus: receivableStatusEnum('financial_status'),
  financialNotes: text('financial_notes'),
  // Datas
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  estimatedCompletionAt: timestamp('estimated_completion_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  // Observações
  customerComplaint: text('customer_complaint'), // Reclamação do cliente
  internalNotes: text('internal_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Diagnósticos ─────────────────────────────────────────────────────────────
export const diagnoses = pgTable('diagnoses', {
  id: uuid('id').defaultRandom().primaryKey(),
  serviceOrderId: uuid('service_order_id')
    .notNull()
    .references(() => serviceOrders.id, { onDelete: 'cascade' }),
  defectId: uuid('defect_id').references(() => defects.id, { onDelete: 'set null' }),
  technicianId: uuid('technician_id').references(() => technicians.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  solution: text('solution'),
  diagnosedAt: timestamp('diagnosed_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Serviços executados ──────────────────────────────────────────────────────
export const servicesPerformed = pgTable('services_performed', {
  id: uuid('id').defaultRandom().primaryKey(),
  serviceOrderId: uuid('service_order_id')
    .notNull()
    .references(() => serviceOrders.id, { onDelete: 'cascade' }),
  serviceCatalogId: uuid('service_catalog_id').references(() => servicesCatalog.id, { onDelete: 'set null' }),
  technicianId: uuid('technician_id').references(() => technicians.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  minutesSpent: integer('minutes_spent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Peças utilizadas ─────────────────────────────────────────────────────────
export const partsUsed = pgTable('parts_used', {
  id: uuid('id').defaultRandom().primaryKey(),
  serviceOrderId: uuid('service_order_id')
    .notNull()
    .references(() => serviceOrders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(), // Nome no momento do uso
  quantity: integer('quantity').notNull().default(1),
  unitCost: numeric('unit_cost', { precision: 12, scale: 2 }),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Histórico da ordem de serviço ────────────────────────────────────────────
export const serviceOrderHistory = pgTable('service_order_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  serviceOrderId: uuid('service_order_id')
    .notNull()
    .references(() => serviceOrders.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  previousStatus: serviceOrderStatusEnum('previous_status'),
  newStatus: serviceOrderStatusEnum('new_status'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Checklist de entrada ─────────────────────────────────────────────────────
export const entryChecklist = pgTable('entry_checklist', {
  id: uuid('id').defaultRandom().primaryKey(),
  serviceOrderId: uuid('service_order_id')
    .notNull()
    .references(() => serviceOrders.id, { onDelete: 'cascade' })
    .unique(),
  // Estado físico
  screenCondition: varchar('screen_condition', { length: 50 }), // 'perfect','scratched','cracked','broken'
  bodyCondition: varchar('body_condition', { length: 50 }),
  hasCase: boolean('has_case').notNull().default(false),
  hasCharger: boolean('has_charger').notNull().default(false),
  hasEarphones: boolean('has_earphones').notNull().default(false),
  hasMemoryCard: boolean('has_memory_card').notNull().default(false),
  hasSimCard: boolean('has_sim_card').notNull().default(false),
  batteryLevel: integer('battery_level'), // 0-100%
  powerOn: boolean('power_on').notNull().default(true),
  extraItems: jsonb('extra_items').$type<string[]>().default([]),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Checklist de saída ───────────────────────────────────────────────────────
export const exitChecklist = pgTable('exit_checklist', {
  id: uuid('id').defaultRandom().primaryKey(),
  serviceOrderId: uuid('service_order_id')
    .notNull()
    .references(() => serviceOrders.id, { onDelete: 'cascade' })
    .unique(),
  screenCondition: varchar('screen_condition', { length: 50 }),
  bodyCondition: varchar('body_condition', { length: 50 }),
  functionalTest: boolean('functional_test').notNull().default(false),
  customerSignature: text('customer_signature'), // Base64 ou URL
  returnedItems: jsonb('returned_items').$type<string[]>().default([]),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Relações ─────────────────────────────────────────────────────────────────
export const techniciansRelations = relations(technicians, ({ one, many }) => ({
  user: one(users, { fields: [technicians.userId], references: [users.id] }),
  serviceOrders: many(serviceOrders),
  diagnoses: many(diagnoses),
  servicesPerformed: many(servicesPerformed),
}));

export const serviceOrdersRelations = relations(serviceOrders, ({ one, many }) => ({
  customer: one(customers, { fields: [serviceOrders.customerId], references: [customers.id] }),
  technician: one(technicians, { fields: [serviceOrders.technicianId], references: [technicians.id] }),
  diagnoses: many(diagnoses),
  servicesPerformed: many(servicesPerformed),
  partsUsed: many(partsUsed),
  history: many(serviceOrderHistory),
  entryChecklist: one(entryChecklist, {
    fields: [serviceOrders.id],
    references: [entryChecklist.serviceOrderId],
  }),
  exitChecklist: one(exitChecklist, {
    fields: [serviceOrders.id],
    references: [exitChecklist.serviceOrderId],
  }),
}));

export const diagnosesRelations = relations(diagnoses, ({ one }) => ({
  serviceOrder: one(serviceOrders, { fields: [diagnoses.serviceOrderId], references: [serviceOrders.id] }),
  defect: one(defects, { fields: [diagnoses.defectId], references: [defects.id] }),
  technician: one(technicians, { fields: [diagnoses.technicianId], references: [technicians.id] }),
}));

export const servicesPerformedRelations = relations(servicesPerformed, ({ one }) => ({
  serviceOrder: one(serviceOrders, { fields: [servicesPerformed.serviceOrderId], references: [serviceOrders.id] }),
  serviceCatalog: one(servicesCatalog, { fields: [servicesPerformed.serviceCatalogId], references: [servicesCatalog.id] }),
  technician: one(technicians, { fields: [servicesPerformed.technicianId], references: [technicians.id] }),
}));

export const partsUsedRelations = relations(partsUsed, ({ one }) => ({
  serviceOrder: one(serviceOrders, { fields: [partsUsed.serviceOrderId], references: [serviceOrders.id] }),
  product: one(products, { fields: [partsUsed.productId], references: [products.id] }),
}));

export const serviceOrderHistoryRelations = relations(serviceOrderHistory, ({ one }) => ({
  serviceOrder: one(serviceOrders, { fields: [serviceOrderHistory.serviceOrderId], references: [serviceOrders.id] }),
  user: one(users, { fields: [serviceOrderHistory.userId], references: [users.id] }),
}));
