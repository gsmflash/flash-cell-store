import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { paginationQuerySchema, buildPaginationMeta } from '../lib/pagination';
import { adminOnly, authenticate, staffOnly } from '../middleware/auth';
import * as techniciansService from '../services/technicians.service';

const router: Router = Router();
router.use(authenticate, staffOnly);

const listQuerySchema = paginationQuerySchema;

const createTechnicianSchema = z.object({
  userId: z.string().uuid('userId inválido.'),
  specialties: z.array(z.string()).optional(),
});

const updateTechnicianSchema = z.object({
  specialties: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const query = listQuerySchema.parse(req.query);
    const { items, total } = await techniciansService.listTechnicians(query);
    res.json({ status: 'ok', data: items, meta: buildPaginationMeta(total, query.page, query.perPage) });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const technician = await techniciansService.getTechnicianById(req.params.id);
    res.json({ status: 'ok', data: technician });
  }),
);

// Criar/editar técnicos é decisão administrativa (mexe no papel do usuário).
router.post(
  '/',
  adminOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const input = createTechnicianSchema.parse(req.body);
    const technician = await techniciansService.createTechnician(input);
    res.status(201).json({ status: 'ok', data: technician });
  }),
);

router.put(
  '/:id',
  adminOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const input = updateTechnicianSchema.parse(req.body);
    const technician = await techniciansService.updateTechnician(req.params.id, input);
    res.json({ status: 'ok', data: technician });
  }),
);

export default router;
