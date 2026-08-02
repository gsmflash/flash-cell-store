import { Router, Request, Response } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { generateSitemapXml } from '../services/sitemap.service';

const router: Router = Router();

router.get(
  '/sitemap.xml',
  asyncHandler(async (_req: Request, res: Response) => {
    const xml = await generateSitemapXml();
    res.type('application/xml').send(xml);
  }),
);

export default router;
