import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { paginationQuerySchema, buildPaginationMeta } from '../lib/pagination';
import { adminOnly, authenticate, staffOnly } from '../middleware/auth';
import * as warrantiesService from '../services/warranties.service';

const router: Router = Router();

const typeSchema = z.enum(['manufacturer', 'store', 'service']);

// ─── Consulta pública (sem login) ────────────────────────────────────────────────
const lookupQuerySchema = z.object({
  imei: z.string().trim().min(1).optional(),
  document: z.string().trim().min(1).optional(),
});

router.get(
  '/lookup',
  asyncHandler(async (req: Request, res: Response) => {
    const query = lookupQuerySchema.parse(req.query);
    res.json({ status: 'ok', data: await warrantiesService.lookupPublicWarranties(query) });
  }),
);

// ─── Gestão (staff) ───────────────────────────────────────────────────────────────
router.use(authenticate, staffOnly);

const listQuerySchema = paginationQuerySchema.extend({
  customerId: z.string().uuid().optional(),
  type: typeSchema.optional(),
});

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const query = listQuerySchema.parse(req.query);
    const { items, total } = await warrantiesService.listWarranties(query);
    res.json({ status: 'ok', data: items, meta: buildPaginationMeta(total, query.page, query.perPage) });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ status: 'ok', data: await warrantiesService.getWarrantyById(req.params.id) });
  }),
);

const claimSchema = z.object({ notes: z.string().max(2000).optional() });

router.post(
  '/:id/claim',
  asyncHandler(async (req: Request, res: Response) => {
    const input = claimSchema.parse(req.body);
    res.json({ status: 'ok', data: await warrantiesService.claimWarranty(req.user!.sub, req.params.id, input.notes) });
  }),
);

const voidSchema = z.object({ reason: z.string().trim().min(1, 'Motivo é obrigatório.').max(2000) });

router.post(
  '/:id/void',
  adminOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const input = voidSchema.parse(req.body);
    res.json({ status: 'ok', data: await warrantiesService.voidWarranty(req.params.id, input.reason) });
  }),
);

export default router;
