import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { describeConstraintError } from '../lib/dbErrors';
import { reportError } from '../lib/errorReporting';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  // Erros de validação Zod (rotas que usam .parse() em vez de .safeParse()
  // e delegam o catch ao errorHandler via asyncHandler).
  if (err instanceof ZodError) {
    res.status(400).json({ status: 'error', message: err.errors[0]?.message ?? 'Requisição inválida.' });
    return;
  }

  // Erros de constraint do Postgres (unique/foreign key/not-null) que
  // escaparem de um service sem tratamento explícito ainda são traduzidos
  // aqui para uma resposta segura, em vez de vazar como 500 genérico.
  const constraintError = describeConstraintError(err);
  if (constraintError) {
    res.status(constraintError.statusCode).json({ status: 'error', message: constraintError.message });
    return;
  }

  const statusCode = err.statusCode ?? 500;
  const isOperational = err.isOperational ?? false;

  // Erros operacionais são esperados (ex.: validação, não encontrado)
  // Erros não-operacionais são bugs — não expõe detalhes ao cliente
  const message = isOperational ? err.message : 'Erro interno do servidor';

  if (!isOperational) {
    reportError(err, { statusCode, method: req.method, path: req.originalUrl });
  }

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
