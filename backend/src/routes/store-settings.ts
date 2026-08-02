import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { adminOnly, authenticate } from '../middleware/auth';
import * as storeSettingsService from '../services/store-settings.service';

const router: Router = Router();

const updateSettingsSchema = z.object({
  storeName: z.string().trim().min(1).max(255).optional(),
  storeDocument: z.string().trim().max(20).optional(),
  storeEmail: z.string().email().optional(),
  storePhone: z.string().trim().max(20).optional(),
  storeWhatsapp: z.string().trim().max(20).optional(),
  storeAddress: z.record(z.unknown()).optional(),
  logoUrl: z.string().url().optional(),
  faviconUrl: z.string().url().optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Cor deve estar no formato hexadecimal, ex: #3654FF.')
    .optional(),
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().max(500).optional(),
  maintenanceMode: z.boolean().optional(),
  allowGuestCheckout: z.boolean().optional(),
});

// Leitura pública — o frontend usa isso para exibir nome/telefone/whatsapp da loja.
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ status: 'ok', data: await storeSettingsService.getStoreSettings() });
  }),
);

router.put(
  '/',
  authenticate,
  adminOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const input = updateSettingsSchema.parse(req.body);
    res.json({ status: 'ok', data: await storeSettingsService.updateStoreSettings(input) });
  }),
);

export default router;
