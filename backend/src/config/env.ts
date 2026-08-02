import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z
    .string()
    .default('3001')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive()),
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL é obrigatório')
    .refine(
      (url) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
      'DATABASE_URL deve ser uma URL PostgreSQL válida',
    ),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  // URL pública do frontend — usada nos links de retorno do checkout de pagamento.
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  // Mercado Pago
  MERCADOPAGO_ACCESS_TOKEN: z.string().optional(),
  // Segredo usado para validar a assinatura do webhook (ver docs do Mercado Pago).
  MERCADOPAGO_WEBHOOK_SECRET: z.string().optional(),
  // E-mail transacional (Resend)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Flash Cell Store <naoresponda@flashcell.com.br>'),
  // Monitoramento de erros — ver lib/errorReporting.ts para como ativar de verdade.
  SENTRY_DSN: z.string().optional(),
  // Armazenamento de arquivos — Cloudflare R2 (compatível com S3)
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),
  // JWT — access e refresh usam segredos independentes.
  // Nunca reutilize o mesmo valor para os dois: um vazamento do segredo de
  // access token não pode servir para forjar refresh tokens (e vice-versa).
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET deve ter no mínimo 32 caracteres'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET deve ter no mínimo 32 caracteres'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌  Variáveis de ambiente inválidas ou ausentes:\n');
  const errors = parsed.error.flatten().fieldErrors;
  for (const [field, messages] of Object.entries(errors)) {
    console.error(`  ${field}: ${messages?.join(', ')}`);
  }
  console.error('\nCopie backend/.env.example para backend/.env e preencha os valores.');
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
