import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { paginationQuerySchema, buildPaginationMeta } from '../lib/pagination';
import { adminOnly, authenticate } from '../middleware/auth';
import * as productsService from '../services/products.service';

const router: Router = Router();

const listQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  brandId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  isFeatured: z.coerce.boolean().optional(),
});

const productInputSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres.').max(255),
  brandId: z.string().uuid('brandId inválido.').optional(),
  categoryId: z.string().uuid('categoryId inválido.').optional(),
  warrantyPolicyId: z.string().uuid('warrantyPolicyId inválido.').or(z.literal('')).optional(),
  sku: z.string().trim().max(100).optional(),
  barcode: z.string().trim().max(50).optional(),
  description: z.string().max(10000).optional(),
  shortDescription: z.string().max(500).optional(),
  costPrice: z.number().nonnegative().optional(),
  sellPrice: z.number().positive('Preço de venda deve ser positivo.'),
  salePrice: z.number().nonnegative().optional(),
  weight: z.number().nonnegative().optional(),
  heightCm: z.number().nonnegative().optional(),
  widthCm: z.number().nonnegative().optional(),
  depthCm: z.number().nonnegative().optional(),
  isFeatured: z.boolean().optional(),
  isService: z.boolean().optional(),
});

const updateProductInputSchema = productInputSchema.partial().extend({
  isActive: z.boolean().optional(),
});

const addImageSchema = z.object({
  url: z.string().url('URL de imagem inválida.'),
  altText: z.string().max(255).optional(),
  sortOrder: z.number().int().optional(),
  isPrimary: z.boolean().optional(),
});

// ─── GET /api/products ──────────────────────────────────────────────────────────
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const query = listQuerySchema.parse(req.query);
    const { items, total } = await productsService.listProducts(query);

    res.json({
      status: 'ok',
      data: items,
      meta: buildPaginationMeta(total, query.page, query.perPage),
    });
  }),
);

// ─── GET /api/products/slug/:slug ───────────────────────────────────────────────
// Registrado ANTES de /:id para não ser interpretado como um id.
router.get(
  '/slug/:slug',
  asyncHandler(async (req: Request, res: Response) => {
    const product = await productsService.getProductBySlug(req.params.slug);
    res.json({ status: 'ok', data: product });
  }),
);

// ─── GET /api/products/:id ───────────────────────────────────────────────────────
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const product = await productsService.getProductById(req.params.id);
    res.json({ status: 'ok', data: product });
  }),
);

// ─── POST /api/products (admin) ──────────────────────────────────────────────────
router.post(
  '/',
  authenticate,
  adminOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const input = productInputSchema.parse(req.body);
    const product = await productsService.createProduct(input);
    res.status(201).json({ status: 'ok', data: product });
  }),
);

// ─── PUT /api/products/:id (admin) ────────────────────────────────────────────────
router.put(
  '/:id',
  authenticate,
  adminOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const input = updateProductInputSchema.parse(req.body);
    const product = await productsService.updateProduct(req.params.id, input);
    res.json({ status: 'ok', data: product });
  }),
);

// ─── DELETE /api/products/:id (admin, soft delete) ─────────────────────────────────
router.delete(
  '/:id',
  authenticate,
  adminOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const product = await productsService.deactivateProduct(req.params.id);
    res.json({ status: 'ok', data: product });
  }),
);

// ─── POST /api/products/:id/images (admin) ──────────────────────────────────────────
router.post(
  '/:id/images',
  authenticate,
  adminOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const input = addImageSchema.parse(req.body);
    const image = await productsService.addProductImage(req.params.id, input);
    res.status(201).json({ status: 'ok', data: image });
  }),
);

// ─── POST /api/products/:id/images/upload (admin) — arquivo do computador ───────────
const uploadImageSchema = z.object({
  base64: z.string().min(1, 'Arquivo vazio.'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  altText: z.string().max(255).optional(),
  isPrimary: z.boolean().optional(),
});

router.post(
  '/:id/images/upload',
  authenticate,
  adminOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const input = uploadImageSchema.parse(req.body);
    const buffer = Buffer.from(input.base64, 'base64');
    const image = await productsService.uploadProductImage(
      req.params.id,
      { buffer, mimeType: input.mimeType },
      { altText: input.altText, isPrimary: input.isPrimary },
    );
    res.status(201).json({ status: 'ok', data: image });
  }),
);

// ─── DELETE /api/products/:productId/images/:imageId (admin) ────────────────────────
router.delete(
  '/:productId/images/:imageId',
  authenticate,
  adminOnly,
  asyncHandler(async (req: Request, res: Response) => {
    await productsService.removeProductImage(req.params.productId, req.params.imageId);
    res.status(204).send();
  }),
);

export default router;
