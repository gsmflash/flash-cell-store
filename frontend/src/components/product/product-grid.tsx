import { Spinner } from '@/components/ui/spinner';
import { ProductCard } from './product-card';
import type { Product } from '@/types/api';

export function ProductGrid({
  products,
  isLoading,
  error,
}: {
  products: Product[] | null;
  isLoading: boolean;
  error: string | null;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-ink/40">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-dashed border-destructive/40 bg-destructive/5 py-16 text-center">
        <p className="text-sm font-medium text-destructive">Não foi possível carregar os produtos.</p>
        <p className="mt-1 text-xs text-destructive/70">{error}</p>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-16 text-center">
        <p className="text-sm font-medium text-ink">Nenhum produto encontrado.</p>
        <p className="mt-1 text-xs text-muted-foreground">Tente ajustar os filtros ou volte mais tarde.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
