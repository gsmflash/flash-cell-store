import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { paginationQuerySchema, buildPaginationMeta } from '../lib/pagination';
import { authenticate, staffOnly } from '../middleware/auth';
import * as serviceOrdersService from '../services/service-orders.service';
import * as financeService from '../services/service-order-finance.service';

const router: Router = Router();

// Ordens de serviço são operação interna da assistência — admin e técnicos.
// (Uma futura tela de "acompanhar minha OS" para o cliente final é um
// endpoint público separado, fora do escopo desta etapa.)
router.use(authenticate, staffOnly);

const deviceTypeSchema = z.enum(['smartphone', 'tablet', 'smartwatch', 'laptop', 'desktop', 'other']);
const statusSchema = z.enum([
  'received',
  'diagnosing',
  'waiting_parts',
  'waiting_approval',
  'approved',
  'in_progress',
  'done',
  'delivered',
  'cancelled',
]);

const listQuerySchema = paginationQuerySchema.extend({
  status: statusSchema.optional(),
  technicianId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const createOrderSchema = z.object({
  customerId: z.string().uuid('customerId inválido.'),
  technicianId: z.string().uuid('technicianId inválido.').optional(),
  deviceType: deviceTypeSchema,
  deviceBrand: z.string().trim().min(1).max(100),
  deviceModel: z.string().trim().min(1).max(100),
  deviceColor: z.string().trim().max(50).optional(),
  deviceImei: z.string().trim().max(20).optional(),
  deviceImei2: z.string().trim().max(20).optional(),
  deviceSerial: z.string().trim().max(100).optional(),
  devicePassword: z.string().trim().max(100).optional(),
  estimatedValue: z.number().nonnegative().optional(),
  estimatedCompletionAt: z.coerce.date().optional(),
  customerComplaint: z.string().max(2000).optional(),
  internalNotes: z.string().max(2000).optional(),
});

const updateOrderSchema = createOrderSchema
  .omit({ customerId: true })
  .partial()
  .extend({
    finalValue: z.number().nonnegative().optional(),
    discount: z.number().nonnegative().optional(),
  });

const changeStatusSchema = z.object({
  status: statusSchema,
  notes: z.string().max(2000).optional(),
});

const addDiagnosisSchema = z.object({
  defectId: z.string().uuid().optional(),
  technicianId: z.string().uuid().optional(),
  description: z.string().trim().min(1, 'Descrição do diagnóstico é obrigatória.'),
  solution: z.string().optional(),
});

const addServicePerformedSchema = z.object({
  serviceCatalogId: z.string().uuid().optional(),
  technicianId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(255),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  minutesSpent: z.number().int().positive().optional(),
});

const addPartUsedSchema = z.object({
  productId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(255),
  quantity: z.number().int().positive(),
  unitCost: z.number().nonnegative().optional(),
  unitPrice: z.number().nonnegative(),
});

const entryChecklistSchema = z.object({
  screenCondition: z.enum(['perfect', 'scratched', 'cracked', 'broken']).optional(),
  bodyCondition: z.enum(['perfect', 'scratched', 'dented', 'broken']).optional(),
  hasCase: z.boolean().optional(),
  hasCharger: z.boolean().optional(),
  hasEarphones: z.boolean().optional(),
  hasMemoryCard: z.boolean().optional(),
  hasSimCard: z.boolean().optional(),
  batteryLevel: z.number().int().min(0).max(100).optional(),
  powerOn: z.boolean().optional(),
  extraItems: z.array(z.string()).optional(),
  notes: z.string().max(2000).optional(),
});

const exitChecklistSchema = z.object({
  screenCondition: z.enum(['perfect', 'scratched', 'cracked', 'broken']).optional(),
  bodyCondition: z.enum(['perfect', 'scratched', 'dented', 'broken']).optional(),
  functionalTest: z.boolean().optional(),
  customerSignature: z.string().optional(),
  returnedItems: z.array(z.string()).optional(),
  notes: z.string().max(2000).optional(),
});

// ─── Listagem e detalhe ─────────────────────────────────────────────────────────
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const query = listQuerySchema.parse(req.query);
    const { items, total } = await serviceOrdersService.listServiceOrders(query);
    res.json({ status: 'ok', data: items, meta: buildPaginationMeta(total, query.page, query.perPage) });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ status: 'ok', data: await serviceOrdersService.getServiceOrderById(req.params.id) });
  }),
);

// ─── Criar e editar ──────────────────────────────────────────────────────────────
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const input = createOrderSchema.parse(req.body);
    const order = await serviceOrdersService.createServiceOrder(req.user!.sub, input);
    res.status(201).json({ status: 'ok', data: order });
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const input = updateOrderSchema.parse(req.body);
    const order = await serviceOrdersService.updateServiceOrder(req.params.id, input);
    res.json({ status: 'ok', data: order });
  }),
);

// ─── Mudança de status ───────────────────────────────────────────────────────────
router.patch(
  '/:id/status',
  asyncHandler(async (req: Request, res: Response) => {
    const input = changeStatusSchema.parse(req.body);
    const order = await serviceOrdersService.changeServiceOrderStatus(req.user!.sub, req.params.id, input.status, input.notes);
    res.json({ status: 'ok', data: order });
  }),
);

// ─── Diagnósticos ─────────────────────────────────────────────────────────────────
router.post(
  '/:id/diagnoses',
  asyncHandler(async (req: Request, res: Response) => {
    const input = addDiagnosisSchema.parse(req.body);
    const diagnosis = await serviceOrdersService.addDiagnosis(req.params.id, input);
    res.status(201).json({ status: 'ok', data: diagnosis });
  }),
);

// ─── Serviços executados ────────────────────────────────────────────────────────
router.post(
  '/:id/services',
  asyncHandler(async (req: Request, res: Response) => {
    const input = addServicePerformedSchema.parse(req.body);
    const service = await serviceOrdersService.addServicePerformed(req.params.id, input);
    res.status(201).json({ status: 'ok', data: service });
  }),
);

// ─── Peças utilizadas (baixa estoque automaticamente) ────────────────────────────
router.post(
  '/:id/parts',
  asyncHandler(async (req: Request, res: Response) => {
    const input = addPartUsedSchema.parse(req.body);
    const part = await serviceOrdersService.addPartUsed(req.user!.sub, req.params.id, input);
    res.status(201).json({ status: 'ok', data: part });
  }),
);

// ─── Checklists ──────────────────────────────────────────────────────────────────
router.put(
  '/:id/entry-checklist',
  asyncHandler(async (req: Request, res: Response) => {
    const input = entryChecklistSchema.parse(req.body);
    const checklist = await serviceOrdersService.upsertEntryChecklist(req.params.id, input);
    res.json({ status: 'ok', data: checklist });
  }),
);

router.put(
  '/:id/exit-checklist',
  asyncHandler(async (req: Request, res: Response) => {
    const input = exitChecklistSchema.parse(req.body);
    const checklist = await serviceOrdersService.upsertExitChecklist(req.params.id, input);
    res.json({ status: 'ok', data: checklist });
  }),
);

// ─── Financeiro ────────────────────────────────────────────────────────────────
const paymentMethodSchema = z.enum(['credit_card', 'debit_card', 'pix', 'boleto', 'cash', 'transfer', 'installment', 'other']);

const finalizeFinancialsSchema = z.object({
  subtotalValue: z.coerce.number().nonnegative('O valor total não pode ser negativo.'),
  discount: z.coerce.number().nonnegative().optional(),
  discountType: z.enum(['fixed', 'percentage']).optional(),
  amountReceived: z.coerce.number().nonnegative().optional(),
  paymentMethod: paymentMethodSchema.optional(),
  paidAt: z.coerce.date().optional(),
  financialNotes: z.string().max(2000).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de vencimento inválida.').optional(),
});

router.post(
  '/:id/finalize-financials',
  asyncHandler(async (req: Request, res: Response) => {
    const input = finalizeFinancialsSchema.parse(req.body);
    const result = await financeService.finalizeServiceOrderFinancials(req.user!.sub, req.params.id, input);
    res.status(201).json({ status: 'ok', data: result });
  }),
);

const registerPaymentSchema = z.object({
  amount: z.coerce.number().positive('O valor do pagamento precisa ser maior que zero.'),
  method: paymentMethodSchema,
  paidAt: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
});

router.post(
  '/:id/payments',
  asyncHandler(async (req: Request, res: Response) => {
    const input = registerPaymentSchema.parse(req.body);
    const result = await financeService.registerServiceOrderPayment(req.user!.sub, req.params.id, input);
    res.status(201).json({ status: 'ok', data: result });
  }),
);

router.get(
  '/:id/payments',
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ status: 'ok', data: await financeService.listServiceOrderPayments(req.params.id) });
  }),
);

router.get(
  '/:id/receivable',
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ status: 'ok', data: await financeService.getServiceOrderReceivable(req.params.id) });
  }),
);

export default router;
