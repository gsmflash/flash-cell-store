import { Router, Request, Response } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { adminOnly, authenticate } from '../middleware/auth';
import { getDashboardStats } from '../services/dashboard.service';

const router: Router = Router();
router.use(authenticate, adminOnly);

router.get(
  '/stats',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ status: 'ok', data: await getDashboardStats() });
  }),
);

export default router;
