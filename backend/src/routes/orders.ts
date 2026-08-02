import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { paginationQuerySchema, buildPaginationMeta } from '../lib/pagination';
import { authenticate } from '../middleware/auth';
import { getOrCreateCustomerForUser } from '../services/customers.service';
import * as ordersService from '../services/orders.service';

const router: Router = Router();
router.use(authenticate);

const isStaff = (role: string) => role === 'admin' || role === 'technician';

const statusSchema = z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']);

const listQuerySchema = paginationQuerySchema.extend({
  status: statusSchema.optional(),
  customerId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const createOrderSchema = z.object({
  addressId: z.string().uuid('addressId inválido.').optional(),
  couponCode: z.string().trim().min(1).optional(),
  notes: z.string().max(2000).optional(),
});

const cancelOrderSchema = z.object({
  reason: z.string().max(2000).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['confirmed', 'processing', 'shipped', 'delivered']),
});

// ─── POST /api/orders — checkout a partir do carrinho ────────────────────────────
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const input = createOrderSchema.parse(req.body);
    const customerId = await getOrCreateCustomerForUser(req.user!.sub);
    const order = await ordersService.createOrderFromCart(req.user!.sub, { customerId, ...input });
    res.status(201).json({ status: 'ok', data: order });
  }),
);

// ─── GET /api/orders ──────────────────────────────────────────────────────────────
// Staff vê todos os pedidos (com filtros); cliente só vê os próprios.
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const query = listQuerySchema.parse(req.query);
    const customerId = isStaff(req.user!.role) ? query.customerId : await getOrCreateCustomerForUser(req.user!.sub);

    const { items, total } = await ordersService.listOrders({ ...query, customerId });
    res.json({ status: 'ok', data: items, meta: buildPaginationMeta(total, query.page, query.perPage) });
  }),
);

// ─── GET /api/orders/:id ────────────────────────────────────────────────────────────
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const ownerCustomerId = isStaff(req.user!.role) ? undefined : await getOrCreateCustomerForUser(req.user!.sub);
    res.json({ status: 'ok', data: await ordersService.getOrderById(req.params.id, ownerCustomerId) });
  }),
);

// ─── PATCH /api/orders/:id/status (staff) ───────────────────────────────────────────
router.patch(
  '/:id/status',
  asyncHandler(async (req: Request, res: Response) => {
    if (!isStaff(req.user!.role)) {
      res.status(403).json({ status: 'error', message: 'Apenas a equipe pode alterar o status do pedido.' });
      return;
    }
    const input = updateStatusSchema.parse(req.body);
    res.json({ status: 'ok', data: await ordersService.updateOrderStatus(req.params.id, input.status) });
  }),
);

// ─── PATCH /api/orders/:id/cancel ────────────────────────────────────────────────────
router.patch(
  '/:id/cancel',
  asyncHandler(async (req: Request, res: Response) => {
    const input = cancelOrderSchema.parse(req.body);
    const ownerCustomerId = isStaff(req.user!.role) ? undefined : await getOrCreateCustomerForUser(req.user!.sub);
    const order = await ordersService.cancelOrder(req.user!.sub, req.params.id, input.reason, ownerCustomerId);
    res.json({ status: 'ok', data: order });
  }),
);

export default router;
