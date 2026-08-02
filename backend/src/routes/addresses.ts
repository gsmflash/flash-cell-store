import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { authenticate } from '../middleware/auth';
import { getOrCreateCustomerForUser } from '../services/customers.service';
import * as addressesService from '../services/addresses.service';

const router: Router = Router();
router.use(authenticate);

const addressInputSchema = z.object({
  label: z.string().trim().max(100).optional(),
  type: z.enum(['residential', 'commercial', 'other']).optional(),
  zipCode: z.string().trim().min(8, 'CEP inválido.').max(10),
  street: z.string().trim().min(1).max(255),
  number: z.string().trim().min(1).max(20),
  complement: z.string().trim().max(100).optional(),
  neighborhood: z.string().trim().min(1).max(100),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().length(2, 'UF deve ter 2 letras.'),
  isDefault: z.boolean().optional(),
});

const updateAddressInputSchema = addressInputSchema.partial();

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const customerId = await getOrCreateCustomerForUser(req.user!.sub);
    res.json({ status: 'ok', data: await addressesService.listAddresses(customerId) });
  }),
);

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const input = addressInputSchema.parse(req.body);
    const customerId = await getOrCreateCustomerForUser(req.user!.sub);
    res.status(201).json({ status: 'ok', data: await addressesService.createAddress(customerId, input) });
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const input = updateAddressInputSchema.parse(req.body);
    const customerId = await getOrCreateCustomerForUser(req.user!.sub);
    res.json({ status: 'ok', data: await addressesService.updateAddress(customerId, req.params.id, input) });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const customerId = await getOrCreateCustomerForUser(req.user!.sub);
    await addressesService.deleteAddress(customerId, req.params.id);
    res.status(204).send();
  }),
);

export default router;
