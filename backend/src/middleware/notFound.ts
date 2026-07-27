import { Request, Response } from 'express';

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    status: 'error',
    message: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
  });
};
