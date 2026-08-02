import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { authenticate } from '../middleware/auth';
import { getOrCreateCustomerForUser } from '../services/customers.service';
import { previewCoupon } from '../services/coupons.service';

const router: Router = Router();
router.use(authenticate);

const previewSchema = z.object({
  code: z.string().trim().min(1, 'Código do cupom obrigatório.'),
  subtotal: z.number().nonnegative(),
});

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const input = previewSchema.parse(req.body);
    const customerId = await getOrCreateCustomerForUser(req.user!.sub);
    const result = await previewCoupon(input.code, input.subtotal, customerId);
    res.json({ status: 'ok', data: result });
  }),
);

export default router;
