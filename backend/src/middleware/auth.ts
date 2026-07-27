import { Request, Response, NextFunction } from 'express';
import { verifyToken, type JwtPayload } from '../lib/jwt';

// Estende o tipo Request do Express para incluir o usuário autenticado
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Middleware que verifica o JWT no header Authorization.
 * Popula req.user com o payload decodificado.
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ status: 'error', message: 'Token de autenticação não fornecido.' });
    return;
  }

  const token = authHeader.slice(7); // Remove "Bearer "

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ status: 'error', message: 'Token inválido ou expirado.' });
  }
};

/**
 * Middleware de autorização por papel (role).
 * Deve ser usado APÓS o middleware authenticate.
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Não autenticado.' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        status: 'error',
        message: `Acesso negado. Requer perfil: ${roles.join(' ou ')}.`,
      });
      return;
    }

    next();
  };
};

/**
 * Atalho: somente administradores.
 */
export const adminOnly = authorize('admin');

/**
 * Atalho: administradores e técnicos.
 */
export const staffOnly = authorize('admin', 'technician');
