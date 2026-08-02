import { Link } from 'react-router-dom';
import { Smartphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PriceTag } from '@/components/ui/price-tag';
import type { Product } from '@/types/api';

export function ProductCard({ product }: { product: Product }) {
  const isOnSale = product.salePrice !== null && product.salePrice < product.sellPrice;

  return (
    <Link
      to={`/produto/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-white transition-shadow hover:shadow-lg"
    >
      <div className="relative flex aspect-square items-center justify-center bg-brand-light">
        <Smartphone size={40} className="text-brand/30" strokeWidth={1.5} />

        <div className="absolute left-3 top-3 flex flex-col gap-1">
          {product.isFeatured && <Badge variant="flash">Destaque</Badge>}
          {isOnSale && <Badge variant="danger">Oferta</Badge>}
        </div>
      </div>

      {/* Borda picotada — remete ao ticket de retirada da assistência técnica */}
      <div className="ticket-edge h-2 w-full" />

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {product.sku ?? 'Flash Cell'}
        </span>
        <h3 className="line-clamp-2 font-display text-sm font-semibold text-ink group-hover:text-brand">
          {product.name}
        </h3>
        <div className="mt-auto pt-2">
          <PriceTag sellPrice={product.sellPrice} salePrice={product.salePrice} />
        </div>
      </div>
    </Link>
  );
}
