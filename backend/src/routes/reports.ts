import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { adminOnly, authenticate } from '../middleware/auth';
import { getSalesReport, getServiceOrdersReport } from '../services/reports.service';

const router: Router = Router();
router.use(authenticate, adminOnly);

const rangeQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});

router.get(
  '/sales',
  asyncHandler(async (req: Request, res: Response) => {
    const query = rangeQuerySchema.parse(req.query);
    res.json({ status: 'ok', data: await getSalesReport(query) });
  }),
);

router.get(
  '/service-orders',
  asyncHandler(async (req: Request, res: Response) => {
    const query = rangeQuerySchema.parse(req.query);
    res.json({ status: 'ok', data: await getServiceOrdersReport(query) });
  }),
);

export default router;
