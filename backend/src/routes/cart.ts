import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { AppError } from '../lib/appError';
import { authenticate, optionalAuth } from '../middleware/auth';
import { getOrCreateCustomerForUser } from '../services/customers.service';
import * as cartService from '../services/cart.service';
import type { CartIdentity } from '../services/cart.service';

const router: Router = Router();

/**
 * Resolve a identidade do carrinho: se autenticado, usa o customerId (criando
 * o registro de customers na primeira vez); senão, exige o header
 * X-Session-Id (o frontend gera um UUID por visitante e reenvia sempre).
 */
async function resolveIdentity(req: Request): Promise<CartIdentity> {
  if (req.user) {
    const customerId = await getOrCreateCustomerForUser(req.user.sub);
    return { customerId };
  }

  const sessionId = req.header('X-Session-Id');
  if (!sessionId) {
    throw AppError.badRequest('Envie o header X-Session-Id para usar o carrinho sem estar autenticado.');
  }
  return { sessionId };
}

const addItemSchema = z.object({
  productId: z.string().uuid('productId inválido.'),
  quantity: z.number().int().positive().default(1),
});

const updateItemSchema = z.object({
  quantity: z.number().int().nonnegative(), // 0 remove o item
});

const mergeSchema = z.object({
  sessionId: z.string().min(1, 'sessionId obrigatório.'),
});

router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const identity = await resolveIdentity(req);
    res.json({ status: 'ok', data: await cartService.getCart(identity) });
  }),
);

router.post(
  '/items',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const identity = await resolveIdentity(req);
    const input = addItemSchema.parse(req.body);
    res.status(201).json({ status: 'ok', data: await cartService.addItem(identity, input.productId, input.quantity) });
  }),
);

router.put(
  '/items/:productId',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const identity = await resolveIdentity(req);
    const input = updateItemSchema.parse(req.body);
    res.json({ status: 'ok', data: await cartService.updateItemQuantity(identity, req.params.productId, input.quantity) });
  }),
);

router.delete(
  '/items/:productId',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const identity = await resolveIdentity(req);
    res.json({ status: 'ok', data: await cartService.removeItem(identity, req.params.productId) });
  }),
);

router.delete(
  '/',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const identity = await resolveIdentity(req);
    res.json({ status: 'ok', data: await cartService.clearCart(identity) });
  }),
);

// Requer autenticação de verdade (não optionalAuth): só faz sentido logado.
router.post(
  '/merge',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const input = mergeSchema.parse(req.body);
    const customerId = await getOrCreateCustomerForUser(req.user!.sub);
    res.json({ status: 'ok', data: await cartService.mergeAnonymousCart(input.sessionId, customerId) });
  }),
);

export default router;
