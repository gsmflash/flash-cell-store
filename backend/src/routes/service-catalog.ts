import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { paginationQuerySchema, buildPaginationMeta } from '../lib/pagination';
import { adminOnly, authenticate, staffOnly } from '../middleware/auth';
import * as serviceCatalogService from '../services/service-catalog.service';

const router: Router = Router();
router.use(authenticate, staffOnly);

const deviceTypeSchema = z.enum(['smartphone', 'tablet', 'smartwatch', 'laptop', 'desktop', 'other']);

const listQuerySchema = paginationQuerySchema.extend({ deviceType: deviceTypeSchema.optional() });

const serviceCatalogInputSchema = z.object({
  name: z.string().trim().min(2).max(255),
  description: z.string().max(2000).optional(),
  price: z.number().nonnegative(),
  estimatedMinutes: z.number().int().positive().optional(),
  deviceType: deviceTypeSchema.optional(),
});

const updateServiceCatalogInputSchema = serviceCatalogInputSchema.partial().extend({ isActive: z.boolean().optional() });

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const query = listQuerySchema.parse(req.query);
    const { items, total } = await serviceCatalogService.listServiceCatalog(query);
    res.json({ status: 'ok', data: items, meta: buildPaginationMeta(total, query.page, query.perPage) });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ status: 'ok', data: await serviceCatalogService.getServiceCatalogById(req.params.id) });
  }),
);

router.post(
  '/',
  adminOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const input = serviceCatalogInputSchema.parse(req.body);
    res.status(201).json({ status: 'ok', data: await serviceCatalogService.createServiceCatalog(input) });
  }),
);

router.put(
  '/:id',
  adminOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const input = updateServiceCatalogInputSchema.parse(req.body);
    res.json({ status: 'ok', data: await serviceCatalogService.updateServiceCatalog(req.params.id, input) });
  }),
);

router.delete(
  '/:id',
  adminOnly,
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ status: 'ok', data: await serviceCatalogService.deactivateServiceCatalog(req.params.id) });
  }),
);

export default router;
