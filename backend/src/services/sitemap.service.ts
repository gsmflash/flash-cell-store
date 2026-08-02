import { eq } from 'drizzle-orm';
import { db } from '../db/index';
import { products, categories } from '../db/schema/index';
import { env } from '../config/env';

function urlEntry(loc: string, lastmod?: string): string {
  return `  <url>\n    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n  </url>`;
}

/** Gera o XML do sitemap com as páginas estáticas + produtos e categorias ativos. */
export async function generateSitemapXml(): Promise<string> {
  const baseUrl = env.FRONTEND_URL.replace(/\/$/, '');

  const staticPaths = ['', '/catalogo', '/assistencia', '/garantia', '/contato'];

  const [activeProducts, activeCategories] = await Promise.all([
    db.select({ slug: products.slug, updatedAt: products.updatedAt }).from(products).where(eq(products.isActive, true)),
    // O filtro de categoria no catálogo usa o id (uuid), não o slug — ver frontend/src/pages/catalog.tsx.
    db.select({ id: categories.id }).from(categories).where(eq(categories.isActive, true)),
  ]);

  const entries = [
    ...staticPaths.map((path) => urlEntry(`${baseUrl}${path}`)),
    ...activeProducts.map((p) => urlEntry(`${baseUrl}/produto/${p.slug}`, p.updatedAt.toISOString().slice(0, 10))),
    ...activeCategories.map((c) => urlEntry(`${baseUrl}/catalogo?categoryId=${c.id}`)),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>`;
}
