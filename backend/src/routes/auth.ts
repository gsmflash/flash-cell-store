import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/index';
import { users, profiles } from '../db/schema/index';
import { hashPassword, comparePassword } from '../lib/hash';
import { generateTokenPair, verifyRefreshToken } from '../lib/jwt';
import { authenticate } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { isLoginBlocked, registerFailedLoginAttempt, resetLoginAttempts } from '../lib/loginAttempts';
import { describeConstraintError } from '../lib/dbErrors';

const router: Router = Router();

// ─── Rate limiting ─────────────────────────────────────────────────────────────
// Login: janela curta e limite baixo por IP — é o alvo mais sensível a força bruta.
const loginRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Muitas tentativas de login a partir deste IP. Tente novamente mais tarde.',
});

// Registro: mais permissivo, mas ainda protegido contra criação massiva de contas.
const registerRateLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Muitas tentativas de cadastro a partir deste IP. Tente novamente mais tarde.',
});

// Refresh: previne abuso do endpoint para tentativa de força bruta de tokens.
const refreshRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Muitas requisições de refresh a partir deste IP. Tente novamente mais tarde.',
});

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
router.post('/login', loginRateLimiter, async (req: Request, res: Response): Promise<void> => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ status: 'error', message: result.error.errors[0]?.message });
    return;
  }

  const { email, password } = result.data;
  const normalizedEmail = email.toLowerCase();

  // Bloqueio por conta: protege contra tentativas distribuídas em vários IPs
  // contra a mesma conta. Mensagem genérica — não revela se é a conta ou o
  // rate limiter por IP que está bloqueando.
  if (isLoginBlocked(normalizedEmail)) {
    res.status(429).json({
      status: 'error',
      message: 'Muitas tentativas de login. Tente novamente mais tarde.',
    });
    return;
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

    if (!user) {
      registerFailedLoginAttempt(normalizedEmail);
      res.status(401).json({ status: 'error', message: 'Credenciais inválidas.' });
      return;
    }

    if (!user.isActive) {
      // Não conta como tentativa de força bruta (a senha nem chega a ser
      // conferida), mas também não informamos que a conta existe e está
      // apenas desativada de forma diferente do caso de credenciais erradas
      // — aqui optamos por manter explícito porque é uma mensagem operacional
      // útil para o próprio dono da conta, não uma pista para um atacante
      // adivinhar e-mails válidos com uma única tentativa.
      res.status(403).json({ status: 'error', message: 'Conta desativada. Contate o suporte.' });
      return;
    }

    const passwordMatch = await comparePassword(password, user.passwordHash);
    if (!passwordMatch) {
      registerFailedLoginAttempt(normalizedEmail);
      res.status(401).json({ status: 'error', message: 'Credenciais inválidas.' });
      return;
    }

    resetLoginAttempts(normalizedEmail);

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
router.post('/register', registerRateLimiter, async (req: Request, res: Response): Promise<void> => {
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
    // A checagem de e-mail duplicado acima cobre o caso comum, mas não
    // elimina uma condição de corrida (duas requisições simultâneas com o
    // mesmo e-mail). A constraint unique no banco é a garantia final —
    // aqui só traduzimos o erro do Postgres em algo seguro para o cliente.
    const constraintError = describeConstraintError(err);
    if (constraintError) {
      res.status(constraintError.statusCode).json({ status: 'error', message: constraintError.message });
      return;
    }

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
router.post('/refresh', refreshRateLimiter, (req: Request, res: Response): void => {
  const result = refreshSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ status: 'error', message: result.error.errors[0]?.message });
    return;
  }

  try {
    // verifyRefreshToken rejeita explicitamente um access token apresentado
    // aqui (payload.type !== 'refresh'), além de checar assinatura/expiração
    // contra o segredo dedicado de refresh.
    const payload = verifyRefreshToken(result.data.refreshToken);
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
