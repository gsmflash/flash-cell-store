import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/index';
import { users, profiles } from '../db/schema/index';
import { hashPassword, comparePassword } from '../lib/hash';
import { generateTokenPair, verifyToken } from '../lib/jwt';
import { authenticate } from '../middleware/auth';

const router: Router = Router();

// ─── Schemas de validação Zod ─────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(1, 'Senha obrigatória.'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres.').max(255),
  email: z.string().email('E-mail inválido.'),
  password: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres.')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula.')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número.'),
  phone: z.string().max(20).optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token obrigatório.'),
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ status: 'error', message: result.error.errors[0]?.message });
    return;
  }

  const { email, password } = result.data;

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      res.status(401).json({ status: 'error', message: 'Credenciais inválidas.' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ status: 'error', message: 'Conta desativada. Contate o suporte.' });
      return;
    }

    const passwordMatch = await comparePassword(password, user.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ status: 'error', message: 'Credenciais inválidas.' });
      return;
    }

    // Atualiza último login
    await db
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id));

    const tokens = generateTokenPair({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      status: 'ok',
      data: {
        user: { id: user.id, email: user.email, role: user.role },
        ...tokens,
      },
    });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ status: 'error', message: 'Erro interno ao realizar login.' });
  }
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ status: 'error', message: result.error.errors[0]?.message });
    return;
  }

  const { name, email, password, phone } = result.data;

  try {
    // Verifica e-mail duplicado
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existing) {
      res.status(409).json({ status: 'error', message: 'E-mail já cadastrado.' });
      return;
    }

    const passwordHash = await hashPassword(password);

    // Cria usuário e perfil em uma transação
    const newUser = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(users)
        .values({
          email: email.toLowerCase(),
          passwordHash,
          role: 'customer',
        })
        .returning({ id: users.id, email: users.email, role: users.role });

      if (!created) throw new Error('Falha ao criar usuário.');

      await tx.insert(profiles).values({
        userId: created.id,
        name,
        phone: phone ?? null,
      });

      return created;
    });

    const tokens = generateTokenPair({
      sub: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    res.status(201).json({
      status: 'ok',
      data: {
        user: { id: newUser.id, email: newUser.email, role: newUser.role },
        ...tokens,
      },
    });
  } catch (err) {
    console.error('[auth/register]', err);
    res.status(500).json({ status: 'error', message: 'Erro interno ao realizar cadastro.' });
  }
});

// ─── GET /api/auth/me (protegido) ─────────────────────────────────────────────
router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        profile: {
          name: profiles.name,
          phone: profiles.phone,
          avatarUrl: profiles.avatarUrl,
          document: profiles.document,
        },
      })
      .from(users)
      .leftJoin(profiles, eq(users.id, profiles.userId))
      .where(eq(users.id, req.user!.sub))
      .limit(1);

    if (!user) {
      res.status(404).json({ status: 'error', message: 'Usuário não encontrado.' });
      return;
    }

    res.json({ status: 'ok', data: user });
  } catch (err) {
    console.error('[auth/me]', err);
    res.status(500).json({ status: 'error', message: 'Erro interno.' });
  }
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
router.post('/refresh', (req: Request, res: Response): void => {
  const result = refreshSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ status: 'error', message: result.error.errors[0]?.message });
    return;
  }

  try {
    const payload = verifyToken(result.data.refreshToken);
    const tokens = generateTokenPair({
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    });
    res.json({ status: 'ok', data: tokens });
  } catch {
    res.status(401).json({ status: 'error', message: 'Refresh token inválido ou expirado.' });
  }
});

export default router;
