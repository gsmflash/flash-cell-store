import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { paginationQuerySchema, buildPaginationMeta } from '../lib/pagination';
import { adminOnly, authenticate } from '../middleware/auth';
import * as couponsService from '../services/coupons.service';

const router: Router = Router();
router.use(authenticate, adminOnly);

const listQuerySchema = paginationQuerySchema;

const couponInputSchema = z.object({
  code: z.string().trim().min(2).max(50),
  description: z.string().max(500).optional(),
  type: z.enum(['percentage', 'fixed']),
  value: z.number().positive(),
  minOrderValue: z.number().nonnegative().optional(),
  maxDiscount: z.number().positive().optional(),
  usageLimit: z.number().int().positive().optional(),
  usageLimitPerUser: z.number().int().positive().optional(),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
});

const updateCouponInputSchema = couponInputSchema.omit({ code: true }).partial().extend({ isActive: z.boolean().optional() });

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const query = listQuerySchema.parse(req.query);
    const { items, total } = await couponsService.listCoupons(query);
    res.json({ status: 'ok', data: items, meta: buildPaginationMeta(total, query.page, query.perPage) });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ status: 'ok', data: await couponsService.getCouponById(req.params.id) });
  }),
);

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const input = couponInputSchema.parse(req.body);
    res.status(201).json({ status: 'ok', data: await couponsService.createCoupon(input) });
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const input = updateCouponInputSchema.parse(req.body);
    res.json({ status: 'ok', data: await couponsService.updateCoupon(req.params.id, input) });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ status: 'ok', data: await couponsService.deactivateCoupon(req.params.id) });
  }),
);

export default router;
