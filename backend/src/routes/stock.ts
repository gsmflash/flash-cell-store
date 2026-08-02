import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { paginationQuerySchema, buildPaginationMeta } from '../lib/pagination';
import { authenticate, staffOnly } from '../middleware/auth';
import * as stockService from '../services/stock.service';

const router: Router = Router();

// Estoque é informação operacional interna — admin e técnicos (que baixam
// peças em ordens de serviço) têm acesso; clientes não.
router.use(authenticate, staffOnly);

const lowStockQuerySchema = paginationQuerySchema;
const listAllStockQuerySchema = paginationQuerySchema.extend({ search: z.string().trim().min(1).optional() });

const movementTypeSchema = z.enum(['in', 'out', 'adjustment', 'return', 'loss']);

const listMovementsQuerySchema = paginationQuerySchema.extend({
  productId: z.string().uuid().optional(),
  type: movementTypeSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const registerMovementSchema = z.object({
  productId: z.string().uuid('productId inválido.'),
  type: movementTypeSchema,
  quantity: z.number().int().positive('Quantidade deve ser um número inteiro positivo.'),
  supplierId: z.string().uuid('supplierId inválido.').optional(),
  unitCost: z.number().nonnegative().optional(),
  reference: z.string().trim().max(100).optional(),
  notes: z.string().max(2000).optional(),
});

// ─── GET /api/stock ──────────────────────────────────────────────────────────────
// Visão geral: saldo de todos os produtos, não só os com estoque baixo.
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const query = listAllStockQuerySchema.parse(req.query);
    const { items, total } = await stockService.listAllStock(query);
    res.json({ status: 'ok', data: items, meta: buildPaginationMeta(total, query.page, query.perPage) });
  }),
);

// ─── GET /api/stock/low ──────────────────────────────────────────────────────────
// Registrado antes de /:productId para não colidir com esse parâmetro.
router.get(
  '/low',
  asyncHandler(async (req: Request, res: Response) => {
    const query = lowStockQuerySchema.parse(req.query);
    const { items, total } = await stockService.listLowStock(query);
    res.json({ status: 'ok', data: items, meta: buildPaginationMeta(total, query.page, query.perPage) });
  }),
);

// ─── GET /api/stock/movements ────────────────────────────────────────────────────
// Também antes de /:productId pelo mesmo motivo.
router.get(
  '/movements',
  asyncHandler(async (req: Request, res: Response) => {
    const query = listMovementsQuerySchema.parse(req.query);
    const { items, total } = await stockService.listMovements(query);
    res.json({ status: 'ok', data: items, meta: buildPaginationMeta(total, query.page, query.perPage) });
  }),
);

// ─── POST /api/stock/movements ───────────────────────────────────────────────────
router.post(
  '/movements',
  asyncHandler(async (req: Request, res: Response) => {
    const input = registerMovementSchema.parse(req.body);
    const result = await stockService.registerMovement(req.user!.sub, input);
    res.status(201).json({ status: 'ok', data: result });
  }),
);

// ─── GET /api/stock/:productId ────────────────────────────────────────────────────
router.get(
  '/:productId',
  asyncHandler(async (req: Request, res: Response) => {
    const stockRow = await stockService.getStockByProductId(req.params.productId);
    res.json({ status: 'ok', data: stockRow });
  }),
);

export default router;
