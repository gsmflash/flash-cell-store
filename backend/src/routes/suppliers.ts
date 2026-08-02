import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { paginationQuerySchema, buildPaginationMeta } from '../lib/pagination';
import { adminOnly, authenticate } from '../middleware/auth';
import * as suppliersService from '../services/suppliers.service';

const router: Router = Router();

// Fornecedores são dados internos de gestão — todas as rotas exigem admin.
router.use(authenticate, adminOnly);

const listQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
});

const supplierInputSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres.').max(255),
  tradeName: z.string().trim().max(255).optional(),
  document: z.string().trim().max(20).optional(),
  email: z.string().email('E-mail inválido.').optional(),
  phone: z.string().trim().max(20).optional(),
  website: z.string().url('URL inválida.').optional(),
  contactName: z.string().trim().max(255).optional(),
  notes: z.string().max(2000).optional(),
});

const updateSupplierInputSchema = supplierInputSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// ─── GET /api/suppliers ─────────────────────────────────────────────────────────
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const query = listQuerySchema.parse(req.query);
    const { items, total } = await suppliersService.listSuppliers(query);
    res.json({ status: 'ok', data: items, meta: buildPaginationMeta(total, query.page, query.perPage) });
  }),
);

// ─── GET /api/suppliers/:id ─────────────────────────────────────────────────────
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const supplier = await suppliersService.getSupplierById(req.params.id);
    res.json({ status: 'ok', data: supplier });
  }),
);

// ─── POST /api/suppliers ────────────────────────────────────────────────────────
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const input = supplierInputSchema.parse(req.body);
    const supplier = await suppliersService.createSupplier(input);
    res.status(201).json({ status: 'ok', data: supplier });
  }),
);

// ─── PUT /api/suppliers/:id ──────────────────────────────────────────────────────
router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const input = updateSupplierInputSchema.parse(req.body);
    const supplier = await suppliersService.updateSupplier(req.params.id, input);
    res.json({ status: 'ok', data: supplier });
  }),
);

// ─── DELETE /api/suppliers/:id (soft delete) ────────────────────────────────────
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const supplier = await suppliersService.deactivateSupplier(req.params.id);
    res.json({ status: 'ok', data: supplier });
  }),
);

export default router;
