import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, User, Zap, Menu, X, ShoppingCart } from 'lucide-react';
import { Container } from '@/components/ui/container';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { CartDrawer } from '@/components/cart/cart-drawer';

const NAV_LINKS = [
  { label: 'Loja', href: '/catalogo' },
  { label: 'Assistência Técnica', href: '/assistencia' },
  { label: 'Contato', href: '/contato' },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const { isAuthenticated, user, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const trimmed = searchValue.trim();
    navigate(trimmed ? `/catalogo?search=${encodeURIComponent(trimmed)}` : '/catalogo');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
      <Container className="flex h-16 items-center gap-4">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ink text-flash">
            <Zap size={18} fill="currentColor" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-ink">
            Flash<span className="text-brand">Cell</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="text-sm font-medium text-ink/70 transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={handleSearch} className="ml-auto hidden flex-1 max-w-sm items-center sm:flex">
          <div className="relative w-full">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Buscar produtos, marcas..."
              className="pl-9"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          {isAuthenticated ? (
            <div className="hidden items-center gap-3 sm:flex">
              <Link to="/minha-conta" className="text-sm text-ink/70 hover:text-ink">
                Olá, {user?.email.split('@')[0]}
              </Link>
              <Button variant="ghost" size="sm" onClick={logout}>
                Sair
              </Button>
            </div>
          ) : (
            <Link to="/entrar" className="hidden sm:block">
              <Button variant="outline" size="sm">
                <User size={16} />
                Entrar
              </Button>
            </Link>
          )}

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="relative rounded-md p-2 text-ink hover:bg-ink/5"
            aria-label="Abrir carrinho"
          >
            <ShoppingCart size={20} />
            {!!cart?.itemCount && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-flash px-1 text-[10px] font-bold text-ink">
                {cart.itemCount}
              </span>
            )}
          </button>

          <button
            type="button"
            className="rounded-md p-2 text-ink md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Abrir menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </Container>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      {menuOpen && (
        <div className="border-t border-border bg-white md:hidden">
          <Container className="flex flex-col gap-1 py-3">
            <form onSubmit={handleSearch} className="mb-2">
              <Input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Buscar produtos..."
              />
            </form>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-2 py-2 text-sm font-medium text-ink/80 hover:bg-ink/5"
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <>
                <Link
                  to="/minha-conta"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-md px-2 py-2 text-sm font-medium text-ink/80 hover:bg-ink/5"
                >
                  Minha conta
                </Link>
                <Link
                  to="/meus-pedidos"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-md px-2 py-2 text-sm font-medium text-ink/80 hover:bg-ink/5"
                >
                  Meus pedidos
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMenuOpen(false);
                  }}
                  className="rounded-md px-2 py-2 text-left text-sm font-medium text-ink/80 hover:bg-ink/5"
                >
                  Sair
                </button>
              </>
            ) : (
              <Link
                to="/entrar"
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-2 py-2 text-sm font-medium text-ink/80 hover:bg-ink/5"
              >
                Entrar
              </Link>
            )}
          </Container>
        </div>
      )}

      <div className="h-[3px] w-full bg-circuit-trace" />
    </header>
  );
}
