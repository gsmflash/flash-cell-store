/**
 * Seed — Cria dados iniciais obrigatórios.
 * Execute: pnpm --filter @flash-cell/backend run db:seed
 *
 * O que este seed cria:
 *   - Usuário administrador padrão
 *   - Perfil do administrador
 *   - Configurações iniciais da loja
 */

import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db, pool } from './index';
import { users, profiles } from './schema/index';
import { storeSettings } from './schema/store';
import { hashPassword } from '../lib/hash';

const ADMIN_EMAIL = 'admin@flashcell.com';
const ADMIN_PASSWORD = 'Admin@12345'; // Altere após o primeiro login!

async function seed() {
  console.log('\n🌱  Iniciando seed do banco de dados...\n');

  try {
    // ── Administrador ──────────────────────────────────────────────────────────
    const [existingAdmin] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, ADMIN_EMAIL))
      .limit(1);

    if (existingAdmin) {
      console.log('  ✓  Administrador já existe — ignorando.');
    } else {
      const passwordHash = await hashPassword(ADMIN_PASSWORD);

      await db.transaction(async (tx) => {
        const [admin] = await tx
          .insert(users)
          .values({
            email: ADMIN_EMAIL,
            passwordHash,
            role: 'admin',
            isActive: true,
            emailVerifiedAt: new Date(),
          })
          .returning({ id: users.id });

        if (!admin) throw new Error('Falha ao criar administrador.');

        await tx.insert(profiles).values({
          userId: admin.id,
          name: 'Administrador',
          phone: null,
        });
      });

      console.log(`  ✓  Administrador criado: ${ADMIN_EMAIL}`);
      console.log(`  ⚠   Senha padrão: ${ADMIN_PASSWORD} — ALTERE IMEDIATAMENTE!`);
    }

    // ── Configurações da loja ──────────────────────────────────────────────────
    const [existingSettings] = await db
      .select({ id: storeSettings.id })
      .from(storeSettings)
      .limit(1);

    if (existingSettings) {
      console.log('  ✓  Configurações da loja já existem — ignorando.');
    } else {
      await db.insert(storeSettings).values({
        storeName: 'Flash Cell Store',
        primaryColor: '#1a1a2e',
      });
      console.log('  ✓  Configurações iniciais da loja criadas.');
    }

    console.log('\n✅  Seed concluído com sucesso!\n');
  } catch (err) {
    console.error('\n❌  Erro durante o seed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
