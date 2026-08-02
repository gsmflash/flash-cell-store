import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { paginationQuerySchema, buildPaginationMeta } from '../lib/pagination';
import { adminOnly, authenticate, staffOnly } from '../middleware/auth';
import * as defectsService from '../services/defects.service';

const router: Router = Router();
router.use(authenticate, staffOnly);

const deviceTypeSchema = z.enum(['smartphone', 'tablet', 'smartwatch', 'laptop', 'desktop', 'other']);

const listQuerySchema = paginationQuerySchema.extend({ deviceType: deviceTypeSchema.optional() });

const defectInputSchema = z.object({
  name: z.string().trim().min(2).max(255),
  description: z.string().max(2000).optional(),
  deviceType: deviceTypeSchema.optional(),
});

const updateDefectInputSchema = defectInputSchema.partial().extend({ isActive: z.boolean().optional() });

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const query = listQuerySchema.parse(req.query);
    const { items, total } = await defectsService.listDefects(query);
    res.json({ status: 'ok', data: items, meta: buildPaginationMeta(total, query.page, query.perPage) });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ status: 'ok', data: await defectsService.getDefectById(req.params.id) });
  }),
);

router.post(
  '/',
  adminOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const input = defectInputSchema.parse(req.body);
    res.status(201).json({ status: 'ok', data: await defectsService.createDefect(input) });
  }),
);

router.put(
  '/:id',
  adminOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const input = updateDefectInputSchema.parse(req.body);
    res.json({ status: 'ok', data: await defectsService.updateDefect(req.params.id, input) });
  }),
);

router.delete(
  '/:id',
  adminOnly,
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ status: 'ok', data: await defectsService.deactivateDefect(req.params.id) });
  }),
);

export default router;
