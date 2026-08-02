import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { paginationQuerySchema, buildPaginationMeta } from '../lib/pagination';
import { adminOnly, authenticate } from '../middleware/auth';
import * as usersService from '../services/users.service';

const router: Router = Router();
router.use(authenticate, adminOnly);

const roleSchema = z.enum(['admin', 'technician', 'customer']);

const listQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  role: roleSchema.optional(),
});

const updateRoleSchema = z.object({ role: roleSchema });
const updateActiveSchema = z.object({ isActive: z.boolean() });

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const query = listQuerySchema.parse(req.query);
    const { items, total } = await usersService.listUsers(query);
    res.json({ status: 'ok', data: items, meta: buildPaginationMeta(total, query.page, query.perPage) });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ status: 'ok', data: await usersService.getUserById(req.params.id) });
  }),
);

router.patch(
  '/:id/role',
  asyncHandler(async (req: Request, res: Response) => {
    const input = updateRoleSchema.parse(req.body);
    res.json({ status: 'ok', data: await usersService.updateUserRole(req.user!.sub, req.params.id, input.role) });
  }),
);

router.patch(
  '/:id/active',
  asyncHandler(async (req: Request, res: Response) => {
    const input = updateActiveSchema.parse(req.body);
    res.json({ status: 'ok', data: await usersService.setUserActive(req.user!.sub, req.params.id, input.isActive) });
  }),
);

export default router;
