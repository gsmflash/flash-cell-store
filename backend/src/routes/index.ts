import { Router } from 'express';
import healthRouter from './health';

const router: Router = Router();

router.use('/health', healthRouter);

// Novas rotas serão adicionadas aqui nas próximas etapas
// Exemplo: router.use('/products', productsRouter);

export default router;
