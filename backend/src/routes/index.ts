import { Router } from 'express';
import healthRouter from './health';
import authRouter from './auth';

const router: Router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);

// Demais rotas serão adicionadas nas próximas etapas:
// router.use('/products', productsRouter);
// router.use('/customers', customersRouter);
// router.use('/orders', ordersRouter);
// router.use('/service-orders', serviceOrdersRouter);

export default router;
