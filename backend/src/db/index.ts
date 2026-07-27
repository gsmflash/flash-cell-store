import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../config/env';
import * as schema from './schema/index';

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  // Configurações recomendadas para produção
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log de erros de conexão inesperados
pool.on('error', (err) => {
  console.error('Erro inesperado no pool do PostgreSQL:', err);
});

export const db = drizzle(pool, { schema });
export { pool };
