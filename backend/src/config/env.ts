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
  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter no mínimo 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  // Cloudflare R2 — opcionais
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),
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
