import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { paginationQuerySchema, buildPaginationMeta } from '../lib/pagination';
import { adminOnly, authenticate } from '../middleware/auth';
import * as brandsService from '../services/brands.service';

const router: Router = Router();

const listQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
});

const createBrandSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres.').max(100),
  logoUrl: z.string().url('URL de logo inválida.').optional(),
});

const updateBrandSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  logoUrl: z.string().url('URL de logo inválida.').nullable().optional(),
  isActive: z.boolean().optional(),
});

// ─── GET /api/brands ───────────────────────────────────────────────────────────
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const query = listQuerySchema.parse(req.query);
    const { items, total } = await brandsService.listBrands(query);

    res.json({
      status: 'ok',
      data: items,
      meta: buildPaginationMeta(total, query.page, query.perPage),
    });
  }),
);

// ─── GET /api/brands/:id ───────────────────────────────────────────────────────
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const brand = await brandsService.getBrandById(req.params.id);
    res.json({ status: 'ok', data: brand });
  }),
);

// ─── POST /api/brands (admin) ──────────────────────────────────────────────────
router.post(
  '/',
  authenticate,
  adminOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const input = createBrandSchema.parse(req.body);
    const brand = await brandsService.createBrand(input);
    res.status(201).json({ status: 'ok', data: brand });
  }),
);

// ─── PUT /api/brands/:id (admin) ───────────────────────────────────────────────
router.put(
  '/:id',
  authenticate,
  adminOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const input = updateBrandSchema.parse(req.body);
    const brand = await brandsService.updateBrand(req.params.id, input);
    res.json({ status: 'ok', data: brand });
  }),
);

// ─── DELETE /api/brands/:id (admin, soft delete) ───────────────────────────────
router.delete(
  '/:id',
  authenticate,
  adminOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const brand = await brandsService.deactivateBrand(req.params.id);
    res.json({ status: 'ok', data: brand });
  }),
);

export default router;
