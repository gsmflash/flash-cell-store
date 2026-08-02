import type { AppError as AppErrorShape } from '../middleware/errorHandler';

/**
 * Erro operacional — representa uma condição esperada (recurso não
 * encontrado, conflito de dados, entrada inválida), não um bug. O
 * errorHandler central usa `isOperational` para decidir se pode expor a
 * mensagem ao cliente com segurança.
 */
export class AppError extends Error implements AppErrorShape {
  public readonly statusCode: number;
  public readonly isOperational = true;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }

  static notFound(message = 'Recurso não encontrado.'): AppError {
    return new AppError(404, message);
  }

  static conflict(message = 'Conflito de dados.'): AppError {
    return new AppError(409, message);
  }

  static badRequest(message = 'Requisição inválida.'): AppError {
    return new AppError(400, message);
  }
}
