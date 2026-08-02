import { eq } from 'drizzle-orm';
import { db } from '../db/index';
import { storeSettings } from '../db/schema/index';

export async function getStoreSettings() {
  const [existing] = await db.select().from(storeSettings).limit(1);
  if (existing) return existing;

  // Primeira leitura: garante que sempre existe uma linha de configurações.
  const [created] = await db.insert(storeSettings).values({}).returning();
  return created;
}

export interface UpdateStoreSettingsInput {
  storeName?: string;
  storeDocument?: string;
  storeEmail?: string;
  storePhone?: string;
  storeWhatsapp?: string;
  storeAddress?: Record<string, unknown>;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  metaTitle?: string;
  metaDescription?: string;
  maintenanceMode?: boolean;
  allowGuestCheckout?: boolean;
}

export async function updateStoreSettings(input: UpdateStoreSettingsInput) {
  const current = await getStoreSettings();

  const [updated] = await db
    .update(storeSettings)
    .set({
      ...(input.storeName !== undefined && { storeName: input.storeName }),
      ...(input.storeDocument !== undefined && { storeDocument: input.storeDocument }),
      ...(input.storeEmail !== undefined && { storeEmail: input.storeEmail }),
      ...(input.storePhone !== undefined && { storePhone: input.storePhone }),
      ...(input.storeWhatsapp !== undefined && { storeWhatsapp: input.storeWhatsapp }),
      ...(input.storeAddress !== undefined && { storeAddress: input.storeAddress }),
      ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
      ...(input.faviconUrl !== undefined && { faviconUrl: input.faviconUrl }),
      ...(input.primaryColor !== undefined && { primaryColor: input.primaryColor }),
      ...(input.metaTitle !== undefined && { metaTitle: input.metaTitle }),
      ...(input.metaDescription !== undefined && { metaDescription: input.metaDescription }),
      ...(input.maintenanceMode !== undefined && { maintenanceMode: input.maintenanceMode }),
      ...(input.allowGuestCheckout !== undefined && { allowGuestCheckout: input.allowGuestCheckout }),
      updatedAt: new Date(),
    })
    .where(eq(storeSettings.id, current.id))
    .returning();

  return updated;
}
