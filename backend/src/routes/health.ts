import { Router, Request, Response } from 'express';

const router: Router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? 'development',
    version: process.env.npm_package_version ?? '0.0.1',
  });
});

export default router;
