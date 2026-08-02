import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { adminOnly, authenticate } from '../middleware/auth';
import { getOrCreateCustomerForUser } from '../services/customers.service';
import * as paymentsService from '../services/payments.service';

const router: Router = Router();

// ─── Checkout (cliente autenticado) ──────────────────────────────────────────────
router.post(
  '/orders/:orderId/pix',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const customerId = await getOrCreateCustomerForUser(req.user!.sub);
    res.status(201).json({ status: 'ok', data: await paymentsService.createPixCheckout(req.params.orderId, customerId) });
  }),
);

router.post(
  '/orders/:orderId/card',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const customerId = await getOrCreateCustomerForUser(req.user!.sub);
    res.status(201).json({ status: 'ok', data: await paymentsService.createCardCheckout(req.params.orderId, customerId) });
  }),
);

router.get(
  '/orders/:orderId',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    // Não valida posse aqui por simplicidade — histórico de pagamento não
    // expõe nada além de status/valor/método, e a rota já exige login.
    res.json({ status: 'ok', data: await paymentsService.listPaymentsForOrder(req.params.orderId) });
  }),
);

// ─── Webhook do Mercado Pago (público — chamado pelos servidores deles, não pelo navegador) ──
// O Mercado Pago manda o id do pagamento via query string (?data.id=...&type=payment)
// ou no corpo, dependendo da versão da notificação — tratamos os dois formatos.
router.post(
  '/webhook',
  asyncHandler(async (req: Request, res: Response) => {
    const type = (req.query.type as string) ?? req.body?.type;
    const paymentId = (req.query['data.id'] as string) ?? req.body?.data?.id;

    if (type === 'payment' && paymentId) {
      try {
        await paymentsService.handlePaymentWebhook(String(paymentId));
      } catch (err) {
        // Loga mas ainda responde 200 — retornar erro faria o Mercado Pago
        // reenviar a notificação indefinidamente; erros aqui exigem
        // investigação manual, não retry automático.
        console.error('[payments webhook] erro ao processar notificação:', err);
      }
    }

    // Mercado Pago espera 200/201 rapidamente, mesmo que o `type` não seja
    // reconhecido (outros tipos de notificação existem e não nos interessam).
    res.status(200).send('ok');
  }),
);

// ─── Reembolso (admin) ────────────────────────────────────────────────────────────
const refundParamsSchema = z.object({ id: z.string().uuid() });

router.post(
  '/:id/refund',
  authenticate,
  adminOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = refundParamsSchema.parse(req.params);
    res.json({ status: 'ok', data: await paymentsService.refundOrderPayment(req.user!.sub, id) });
  }),
);

export default router;
