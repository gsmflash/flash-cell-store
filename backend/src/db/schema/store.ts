import {
  pgTable, uuid, varchar, boolean, timestamp, text, integer, jsonb,
} from 'drizzle-orm/pg-core';
import { bannerPositionEnum } from './enums';

// ─── Banners ──────────────────────────────────────────────────────────────────
export const banners = pgTable('banners', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  subtitle: varchar('subtitle', { length: 255 }),
  imageUrl: text('image_url').notNull(),
  imageMobileUrl: text('image_mobile_url'),
  linkUrl: text('link_url'),
  altText: varchar('alt_text', { length: 255 }),
  position: bannerPositionEnum('position').notNull().default('home_top'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Configurações da loja ────────────────────────────────────────────────────
// Uma única linha com todas as configurações (chave = nome da configuração)
export const storeSettings = pgTable('store_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  // Identidade
  storeName: varchar('store_name', { length: 255 }).notNull().default('Flash Cell Store'),
  storeDocument: varchar('store_document', { length: 20 }), // CNPJ
  storeEmail: varchar('store_email', { length: 255 }),
  storePhone: varchar('store_phone', { length: 20 }),
  storeWhatsapp: varchar('store_whatsapp', { length: 20 }),
  storeAddress: jsonb('store_address'),        // Endereço completo em JSON
  // Aparência
  logoUrl: text('logo_url'),
  faviconUrl: text('favicon_url'),
  primaryColor: varchar('primary_color', { length: 7 }).default('#000000'),
  // SEO
  metaTitle: varchar('meta_title', { length: 255 }),
  metaDescription: text('meta_description'),
  // Operacional
  maintenanceMode: boolean('maintenance_mode').notNull().default(false),
  allowGuestCheckout: boolean('allow_guest_checkout').notNull().default(true),
  // Configurações extras (flexível)
  extra: jsonb('extra'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
