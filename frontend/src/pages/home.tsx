import { Link } from 'react-router-dom';
import { Zap, Wrench, ShieldCheck, Truck, ChevronRight } from 'lucide-react';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { ProductGrid } from '@/components/product/product-grid';
import { useCategories, useProducts } from '@/hooks/useCatalog';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

const TRUST_ITEMS = [
  { icon: Wrench, label: 'Conserto expresso', desc: 'Boa parte dos reparos sai no mesmo dia' },
  { icon: ShieldCheck, label: 'Garantia real', desc: 'Peças e serviços com garantia por escrito' },
  { icon: Truck, label: 'Retirada rápida', desc: 'Acompanhe o status da sua OS' },
];

export function Home() {
  useDocumentMeta({
    title: 'Início',
    description: 'Conserto rápido, peças originais e os melhores aparelhos com quem entende de celular.',
  });

  const { data: categories } = useCategories();
  const featured = useProducts({ isFeatured: true, perPage: 8 });

  const topCategories = (categories ?? []).slice(0, 6);

  return (
    <div>
      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border bg-ink text-white">
        <div className="absolute inset-0 bg-circuit-trace opacity-[0.06]" />
        <Container className="relative grid gap-10 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-flash/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-flash">
              <Zap size={12} fill="currentColor" /> Assistência técnica e loja
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
              Conserto rápido.
              <br />
              Peças <span className="text-flash">originais</span>.
            </h1>
            <p className="mt-4 max-w-md text-white/70">
              Da troca de tela ao aparelho novo: tudo o que seu celular precisa, num só lugar — com quem realmente
              entende do assunto.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/catalogo">
                <Button variant="flash" size="lg">
                  Ver catálogo <ChevronRight size={18} />
                </Button>
              </Link>
              <Link to="/assistencia">
                <Button variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10">
                  Agendar assistência
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative mx-auto hidden aspect-square w-full max-w-sm items-center justify-center md:flex">
            <div className="absolute h-56 w-56 rounded-full bg-brand/30 blur-3xl" />
            <div className="relative flex h-64 w-40 items-center justify-center rounded-[2rem] border-4 border-white/10 bg-white/5 backdrop-blur">
              <Zap size={72} className="text-flash" fill="currentColor" />
            </div>
          </div>
        </Container>
      </section>

      {/* ─── Prova social / diferenciais ──────────────────────────────── */}
      <section className="border-b border-border bg-white">
        <Container className="grid gap-6 py-8 sm:grid-cols-3">
          {TRUST_ITEMS.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-light text-brand">
                <Icon size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </Container>
      </section>

      {/* ─── Categorias ────────────────────────────────────────────────── */}
      {topCategories.length > 0 && (
        <section>
          <Container className="py-14">
            <h2 className="font-display text-2xl font-bold text-ink">Categorias</h2>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {topCategories.map((category) => (
                <Link
                  key={category.id}
                  to={`/catalogo?categoryId=${category.id}`}
                  className="rounded-lg border border-border bg-white p-4 text-center text-sm font-medium text-ink transition-colors hover:border-brand hover:text-brand"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* ─── Produtos em destaque ─────────────────────────────────────── */}
      <section className="bg-white">
        <Container className="py-14">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-ink">Mais vendidos</h2>
            <Link to="/catalogo" className="flex items-center text-sm font-medium text-brand hover:underline">
              Ver tudo <ChevronRight size={16} />
            </Link>
          </div>
          <div className="mt-6">
            <ProductGrid products={featured.data} isLoading={featured.isLoading} error={featured.error} />
          </div>
        </Container>
      </section>
    </div>
  );
}
