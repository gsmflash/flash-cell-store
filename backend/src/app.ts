import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import router from './routes/index';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { rateLimiter } from './middleware/rateLimiter';
import sitemapRouter from './routes/sitemap';

const app: Application = express();

// Segurança — headers HTTP
app.use(helmet());

// CORS
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Id'],
  }),
);

// Parse de body
// Limite subido de 10mb pra 15mb: upload de imagem de produto (Módulo 1) manda
// o arquivo como base64 no corpo da requisição, que fica ~37% maior que o
// arquivo original — uma imagem de 8MB (nosso teto em lib/r2Storage.ts) vira
// quase 11MB codificada.
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Sitemap fica fora do prefixo /api — é convenção que mecanismos de busca
// esperam em /sitemap.xml na raiz do domínio.
app.use(sitemapRouter);

// Rate limiting geral da API — proteção básica contra abuso/scraping em
// massa. As rotas de auth já têm limites bem mais restritos e específicos
// (ver routes/auth.ts); este aqui é só um teto generoso para todo o resto.
app.use(
  '/api',
  rateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 600,
    message: 'Muitas requisições a partir deste IP. Tente novamente mais tarde.',
  }),
);

// Rotas da API
app.use('/api', router);

// 404 para rotas não registradas
app.use(notFound);

// Tratamento global de erros (deve ser o último middleware)
app.use(errorHandler);

export default app;
