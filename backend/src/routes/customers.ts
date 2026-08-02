import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { paginationQuerySchema, buildPaginationMeta } from '../lib/pagination';
import { authenticate, staffOnly } from '../middleware/auth';
import * as customersService from '../services/customers.service';

const router: Router = Router();

// Clientes são dados internos de atendimento — acessíveis a admin e técnicos.
router.use(authenticate, staffOnly);

const listQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
});

const customerInputSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres.').max(255),
  email: z.string().email('E-mail inválido.').optional(),
  phone: z.string().trim().max(20).optional(),
  whatsapp: z.string().trim().max(20).optional(),
  document: z.string().trim().max(20).optional(),
  documentType: z.enum(['cpf', 'cnpj']).optional(),
  notes: z.string().max(2000).optional(),
});

const updateCustomerInputSchema = customerInputSchema.partial().extend({
  isActive: z.boolean().optional(),
});

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const query = listQuerySchema.parse(req.query);
    const { items, total } = await customersService.listCustomers(query);
    res.json({ status: 'ok', data: items, meta: buildPaginationMeta(total, query.page, query.perPage) });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const customer = await customersService.getCustomerById(req.params.id);
    res.json({ status: 'ok', data: customer });
  }),
);

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const input = customerInputSchema.parse(req.body);
    const customer = await customersService.createCustomer(input);
    res.status(201).json({ status: 'ok', data: customer });
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const input = updateCustomerInputSchema.parse(req.body);
    const customer = await customersService.updateCustomer(req.params.id, input);
    res.json({ status: 'ok', data: customer });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const customer = await customersService.deactivateCustomer(req.params.id);
    res.json({ status: 'ok', data: customer });
  }),
);

export default router;
