import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

config();

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // Para `drizzle-kit generate`, qualquer URL válida é aceita.
    // Para `push` e `migrate`, configure DATABASE_URL no .env.
    url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/flash_cell_store',
  },
  verbose: true,
  strict: false,
});
