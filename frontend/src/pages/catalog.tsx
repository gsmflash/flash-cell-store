import { useSearchParams } from 'react-router-dom';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { ProductGrid } from '@/components/product/product-grid';
import { useBrands, useCategories, useProducts } from '@/hooks/useCatalog';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { cn } from '@/lib/utils';

const PER_PAGE = 12;

export function Catalog() {
  useDocumentMeta({
    title: 'Catálogo',
    description: 'Celulares, acessórios e peças originais com os melhores preços.',
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const { data: brands } = useBrands();
  const { data: categories } = useCategories();

  const search = searchParams.get('search') ?? undefined;
  const brandId = searchParams.get('brandId') ?? undefined;
  const categoryId = searchParams.get('categoryId') ?? undefined;
  const isFeatured = searchParams.get('isFeatured') === 'true' ? true : undefined;
  const page = Number(searchParams.get('page') ?? '1');

  const { data: products, isLoading, error, meta } = useProducts({
    search,
    brandId,
    categoryId,
    isFeatured,
    page,
    perPage: PER_PAGE,
  });

  function updateFilter(key: string, value: string | undefined) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page'); // qualquer mudança de filtro reinicia a paginação
    setSearchParams(next);
  }

  function goToPage(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next);
  }

  return (
    <Container className="py-10">
      <div className="flex flex-col gap-1 border-b border-border pb-6">
        <h1 className="font-display text-3xl font-bold text-ink">Catálogo</h1>
        <p className="text-sm text-muted-foreground">
          {meta ? `${meta.total} produto${meta.total === 1 ? '' : 's'} encontrado${meta.total === 1 ? '' : 's'}` : ' '}
        </p>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[220px_1fr]">
        {/* ─── Filtros ────────────────────────────────────────────────── */}
        <aside className="space-y-6">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Marca</h3>
            <div className="mt-3 flex flex-wrap gap-2 lg:flex-col lg:items-start lg:gap-1">
              <FilterOption
                label="Todas"
                active={!brandId}
                onClick={() => updateFilter('brandId', undefined)}
              />
              {(brands ?? []).map((brand) => (
                <FilterOption
                  key={brand.id}
                  label={brand.name}
                  active={brandId === brand.id}
                  onClick={() => updateFilter('brandId', brand.id)}
                />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Categoria</h3>
            <div className="mt-3 flex flex-wrap gap-2 lg:flex-col lg:items-start lg:gap-1">
              <FilterOption
                label="Todas"
                active={!categoryId}
                onClick={() => updateFilter('categoryId', undefined)}
              />
              {(categories ?? []).map((category) => (
                <FilterOption
                  key={category.id}
                  label={category.name}
                  active={categoryId === category.id}
                  onClick={() => updateFilter('categoryId', category.id)}
                />
              ))}
            </div>
          </div>
        </aside>

        {/* ─── Resultados ─────────────────────────────────────────────── */}
        <div>
          <ProductGrid products={products} isLoading={isLoading} error={error} />

          {meta && meta.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
                Anterior
              </Button>
              <span className="px-2 font-mono text-sm text-muted-foreground">
                {page} / {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => goToPage(page + 1)}
              >
                Próxima
              </Button>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}

function FilterOption({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        active ? 'bg-brand text-white' : 'bg-transparent text-ink/70 hover:bg-ink/5',
      )}
    >
      {label}
    </button>
  );
}
