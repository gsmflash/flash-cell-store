import type { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

/**
 * Envolve um handler async para que qualquer erro lançado (ou rejeição de
 * Promise) seja encaminhado a `next(err)` — e, portanto, tratado pelo
 * errorHandler central — em vez de virar uma unhandled rejection.
 */
export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
