import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, PackageCheck, PackageX, ShieldCheck, Smartphone } from 'lucide-react';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PriceTag } from '@/components/ui/price-tag';
import { Spinner } from '@/components/ui/spinner';
import { useProductBySlug } from '@/hooks/useCatalog';
import { useCart } from '@/hooks/useCart';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { buildWhatsAppLink } from '@/lib/whatsapp';

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: product, isLoading, error } = useProductBySlug(slug);
  const { addItem } = useCart();
  const { settings: storeSettings } = useStoreSettings();
  const [activeImage, setActiveImage] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);

  useDocumentMeta({
    title: product?.name ?? 'Produto',
    description: product?.shortDescription ?? undefined,
    image: product?.images[0]?.url,
  });

  if (isLoading) {
    return (
      <Container className="flex justify-center py-24 text-ink/40">
        <Spinner className="h-8 w-8" />
      </Container>
    );
  }

  if (error || !product) {
    return (
      <Container className="py-24 text-center">
        <p className="font-display text-xl font-semibold text-ink">Produto não encontrado</p>
        <p className="mt-2 text-sm text-muted-foreground">{error ?? 'Verifique o link e tente novamente.'}</p>
        <Link to="/catalogo" className="mt-6 inline-block">
          <Button variant="outline">Voltar ao catálogo</Button>
        </Link>
      </Container>
    );
  }

  const images = product.images;
  const inStock = (product.stock?.quantity ?? 0) > 0 || product.isService;

  return (
    <Container className="py-10">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-ink">Início</Link>
        <ChevronRight size={12} />
        <Link to="/catalogo" className="hover:text-ink">Catálogo</Link>
        <ChevronRight size={12} />
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        {/* ─── Galeria ────────────────────────────────────────────────── */}
        <div>
          <div className="flex aspect-square items-center justify-center rounded-lg border border-border bg-brand-light">
            {images.length > 0 ? (
              <img
                src={images[activeImage]?.url}
                alt={images[activeImage]?.altText ?? product.name}
                className="h-full w-full rounded-lg object-cover"
              />
            ) : (
              <Smartphone size={72} className="text-brand/30" strokeWidth={1.5} />
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setActiveImage(index)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 ${
                    index === activeImage ? 'border-brand' : 'border-transparent'
                  }`}
                >
                  <img src={image.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ─── Informações ────────────────────────────────────────────── */}
        <div>
          <div className="flex flex-wrap gap-2">
            {product.brand && <Badge variant="brand">{product.brand.name}</Badge>}
            {product.isFeatured && <Badge variant="flash">Destaque</Badge>}
          </div>

          <h1 className="mt-3 font-display text-3xl font-bold text-ink">{product.name}</h1>

          {product.shortDescription && (
            <p className="mt-2 text-sm text-muted-foreground">{product.shortDescription}</p>
          )}

          <div className="mt-5">
            <PriceTag sellPrice={product.sellPrice} salePrice={product.salePrice} size="lg" />
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm">
            {inStock ? (
              <>
                <PackageCheck size={16} className="text-success" />
                <span className="font-medium text-success">Em estoque</span>
              </>
            ) : (
              <>
                <PackageX size={16} className="text-destructive" />
                <span className="font-medium text-destructive">Fora de estoque</span>
              </>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <Button
              variant="primary"
              size="lg"
              disabled={!inStock || isAdding}
              className="flex-1"
              onClick={async () => {
                setIsAdding(true);
                try {
                  await addItem(product.id, 1);
                  setAdded(true);
                  setTimeout(() => setAdded(false), 2000);
                } finally {
                  setIsAdding(false);
                }
              }}
            >
              {!inStock ? 'Fora de estoque' : added ? 'Adicionado ✓' : isAdding ? 'Adicionando...' : 'Adicionar ao carrinho'}
            </Button>
          </div>

          {product.warrantyPolicy && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-border bg-brand-light/40 p-3">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-brand" />
              <div>
                <p className="text-sm font-semibold text-ink">{product.warrantyPolicy.name} — {product.warrantyPolicy.days} dias</p>
                {product.warrantyPolicy.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{product.warrantyPolicy.description}</p>
                )}
              </div>
            </div>
          )}

          {storeSettings?.storeWhatsapp && (
            <a
              href={buildWhatsAppLink(
                storeSettings.storeWhatsapp,
                `Olá! Tenho uma dúvida sobre o produto "${product.name}" (${window.location.href})`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 text-sm font-medium text-success hover:underline"
            >
              Perguntar sobre este produto no WhatsApp
            </a>
          )}

          {product.sku && (
            <p className="mt-4 font-mono text-xs text-muted-foreground">SKU: {product.sku}</p>
          )}

          {product.description && (
            <div className="mt-8 border-t border-border pt-6">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">Descrição</h2>
              <p className="mt-3 whitespace-pre-line text-sm text-ink/80">{product.description}</p>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
