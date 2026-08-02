import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router: Router = Router();

// Caminho para o openapi.yaml na raiz do package backend.
const OPENAPI_PATH = path.resolve(__dirname, '..', '..', 'openapi.yaml');

router.get('/openapi.yaml', (_req: Request, res: Response) => {
  try {
    const content = fs.readFileSync(OPENAPI_PATH, 'utf-8');
    res.type('text/yaml').send(content);
  } catch {
    res.status(404).json({ status: 'error', message: 'openapi.yaml não encontrado.' });
  }
});

export default router;
