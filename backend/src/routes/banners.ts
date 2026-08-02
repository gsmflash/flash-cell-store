import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { paginationQuerySchema, buildPaginationMeta } from '../lib/pagination';
import { adminOnly, authenticate } from '../middleware/auth';
import * as bannersService from '../services/banners.service';

const router: Router = Router();

const positionSchema = z.enum(['home_top', 'home_middle', 'home_bottom', 'sidebar', 'category']);

const listQuerySchema = paginationQuerySchema.extend({ position: positionSchema.optional() });

const bannerInputSchema = z.object({
  title: z.string().trim().min(1).max(255),
  subtitle: z.string().max(255).optional(),
  imageUrl: z.string().url('URL de imagem inválida.'),
  imageMobileUrl: z.string().url().optional(),
  linkUrl: z.string().url().optional(),
  altText: z.string().max(255).optional(),
  position: positionSchema.optional(),
  sortOrder: z.number().int().optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
});

const updateBannerInputSchema = bannerInputSchema.partial().extend({ isActive: z.boolean().optional() });

// Leitura é pública — a Home precisa buscar os banners ativos sem estar logado.
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const query = listQuerySchema.parse(req.query);
    const { items, total } = await bannersService.listBanners(query);
    res.json({ status: 'ok', data: items, meta: buildPaginationMeta(total, query.page, query.perPage) });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ status: 'ok', data: await bannersService.getBannerById(req.params.id) });
  }),
);

router.post(
  '/',
  authenticate,
  adminOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const input = bannerInputSchema.parse(req.body);
    res.status(201).json({ status: 'ok', data: await bannersService.createBanner(input) });
  }),
);

router.put(
  '/:id',
  authenticate,
  adminOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const input = updateBannerInputSchema.parse(req.body);
    res.json({ status: 'ok', data: await bannersService.updateBanner(req.params.id, input) });
  }),
);

router.delete(
  '/:id',
  authenticate,
  adminOnly,
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ status: 'ok', data: await bannersService.deactivateBanner(req.params.id) });
  }),
);

export default router;
