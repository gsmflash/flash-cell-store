import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  const statusCode = err.statusCode ?? 500;
  const isOperational = err.isOperational ?? false;

  // Erros operacionais são esperados (ex.: validação, não encontrado)
  // Erros não-operacionais são bugs — não expõe detalhes ao cliente
  const message = isOperational ? err.message : 'Erro interno do servidor';

  if (!isOperational) {
    console.error('[ERRO NÃO OPERACIONAL]', {
      message: err.message,
      stack: err.stack,
      statusCode,
    });
  }

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
