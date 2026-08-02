import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { authenticate, staffOnly } from '../middleware/auth';
import { listAccountsReceivable } from '../services/service-order-finance.service';

const router: Router = Router();
router.use(authenticate, staffOnly);

const listQuerySchema = z.object({
  status: z.enum(['pending', 'partial', 'paid']).optional(),
});

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const query = listQuerySchema.parse(req.query);
    res.json({ status: 'ok', data: await listAccountsReceivable(query) });
  }),
);

export default router;
