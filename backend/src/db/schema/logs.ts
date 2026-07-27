import {
  pgTable, uuid, varchar, timestamp, text, jsonb, inet,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { logLevelEnum } from './enums';

// ─── Logs do sistema ──────────────────────────────────────────────────────────
export const systemLogs = pgTable('system_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  level: logLevelEnum('level').notNull().default('info'),
  action: varchar('action', { length: 100 }).notNull(), // Ex: 'user.login', 'order.created'
  entity: varchar('entity', { length: 100 }),           // Ex: 'user', 'order', 'product'
  entityId: uuid('entity_id'),
  message: text('message').notNull(),
  metadata: jsonb('metadata'),                           // Dados extras (payload, before/after)
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Relações ─────────────────────────────────────────────────────────────────
export const systemLogsRelations = relations(systemLogs, ({ one }) => ({
  user: one(users, { fields: [systemLogs.userId], references: [users.id] }),
}));
