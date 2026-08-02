import { pgTable, uuid, varchar, integer, boolean, timestamp, text } from 'drizzle-orm/pg-core';

// ─── Políticas de garantia ──────────────────────────────────────────────────────
// Catálogo de garantias reutilizáveis (ex.: "Garantia Padrão — 90 dias"),
// que o admin cadastra uma vez e vincula aos produtos. Isso é diferente da
// tabela `warranties` (que guarda uma garantia já emitida pra um cliente
// específico) — aqui é só o "modelo"/política.
export const warrantyPolicies = pgTable('warranty_policies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  days: integer('days').notNull(),
  notes: text('notes'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
