import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { paginationQuerySchema, buildPaginationMeta } from '../lib/pagination';
import { adminOnly, authenticate, staffOnly } from '../middleware/auth';
import * as warrantyPoliciesService from '../services/warranty-policies.service';

const router: Router = Router();
router.use(authenticate, staffOnly);

const listQuerySchema = paginationQuerySchema.extend({
  includeInactive: z.coerce.boolean().optional(),
  search: z.string().trim().min(1).optional(),
});

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const query = listQuerySchema.parse(req.query);
    const { items, total } = await warrantyPoliciesService.listWarrantyPolicies(query);
    res.json({ status: 'ok', data: items, meta: buildPaginationMeta(total, query.page, query.perPage) });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ status: 'ok', data: await warrantyPoliciesService.getWarrantyPolicyById(req.params.id) });
  }),
);

const policyInputSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório.').max(255),
  description: z.string().max(2000).optional(),
  days: z.coerce.number().int().positive('O prazo precisa ser maior que zero.'),
  notes: z.string().max(2000).optional(),
});

router.post(
  '/',
  adminOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const input = policyInputSchema.parse(req.body);
    res.status(201).json({ status: 'ok', data: await warrantyPoliciesService.createWarrantyPolicy(input) });
  }),
);

const policyUpdateSchema = policyInputSchema.partial().extend({ isActive: z.boolean().optional() });

router.put(
  '/:id',
  adminOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const input = policyUpdateSchema.parse(req.body);
    res.json({ status: 'ok', data: await warrantyPoliciesService.updateWarrantyPolicy(req.params.id, input) });
  }),
);

router.delete(
  '/:id',
  adminOnly,
  asyncHandler(async (req: Request, res: Response) => {
    await warrantyPoliciesService.deleteWarrantyPolicy(req.params.id);
    res.json({ status: 'ok', data: null });
  }),
);

export default router;
