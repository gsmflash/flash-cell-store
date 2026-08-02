import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { adminOnly, authenticate } from '../middleware/auth';
import * as categoriesService from '../services/categories.service';

const router: Router = Router();

const listQuerySchema = z.object({
  /** 'tree' (padrão) retorna hierarquia; 'flat' retorna lista simples. */
  format: z.enum(['tree', 'flat']).default('tree'),
});

const createCategorySchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres.').max(100),
  parentId: z.string().uuid('parentId inválido.').optional(),
  description: z.string().max(2000).optional(),
  imageUrl: z.string().url('URL de imagem inválida.').optional(),
  sortOrder: z.number().int().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  parentId: z.string().uuid('parentId inválido.').nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  imageUrl: z.string().url('URL de imagem inválida.').nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

// ─── GET /api/categories ───────────────────────────────────────────────────────
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { format } = listQuerySchema.parse(req.query);
    const data =
      format === 'flat' ? await categoriesService.listCategoriesFlat() : await categoriesService.listCategoriesTree();
    res.json({ status: 'ok', data });
  }),
);

// ─── GET /api/categories/:id ────────────────────────────────────────────────────
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const category = await categoriesService.getCategoryById(req.params.id);
    res.json({ status: 'ok', data: category });
  }),
);

// ─── POST /api/categories (admin) ───────────────────────────────────────────────
router.post(
  '/',
  authenticate,
  adminOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const input = createCategorySchema.parse(req.body);
    const category = await categoriesService.createCategory(input);
    res.status(201).json({ status: 'ok', data: category });
  }),
);

// ─── PUT /api/categories/:id (admin) ────────────────────────────────────────────
router.put(
  '/:id',
  authenticate,
  adminOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const input = updateCategorySchema.parse(req.body);
    const category = await categoriesService.updateCategory(req.params.id, input);
    res.json({ status: 'ok', data: category });
  }),
);

// ─── DELETE /api/categories/:id (admin, soft delete) ────────────────────────────
router.delete(
  '/:id',
  authenticate,
  adminOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const category = await categoriesService.deactivateCategory(req.params.id);
    res.json({ status: 'ok', data: category });
  }),
);

export default router;
