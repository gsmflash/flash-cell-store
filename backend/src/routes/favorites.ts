import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { authenticate } from '../middleware/auth';
import { getOrCreateCustomerForUser } from '../services/customers.service';
import * as favoritesService from '../services/favorites.service';

const router: Router = Router();
router.use(authenticate);

const addFavoriteSchema = z.object({
  productId: z.string().uuid('productId inválido.'),
});

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const customerId = await getOrCreateCustomerForUser(req.user!.sub);
    res.json({ status: 'ok', data: await favoritesService.listFavorites(customerId) });
  }),
);

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const input = addFavoriteSchema.parse(req.body);
    const customerId = await getOrCreateCustomerForUser(req.user!.sub);
    res.status(201).json({ status: 'ok', data: await favoritesService.addFavorite(customerId, input.productId) });
  }),
);

router.delete(
  '/:productId',
  asyncHandler(async (req: Request, res: Response) => {
    const customerId = await getOrCreateCustomerForUser(req.user!.sub);
    await favoritesService.removeFavorite(customerId, req.params.productId);
    res.status(204).send();
  }),
);

export default router;
