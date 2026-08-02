import { useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Tag,
  FolderTree,
  Boxes,
  ShoppingBag,
  Wrench,
  Users,
  UserCog,
  Ticket,
  Image,
  Settings,
  ScrollText,
  ShieldCheck,
  BarChart3,
  ClipboardList,
  Zap,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Container } from '@/components/ui/container';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

const NAV_SECTIONS = [
  {
    title: 'Visão geral',
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, end: true },
      { label: 'Relatórios', href: '/admin/relatorios', icon: BarChart3 },
    ],
  },
  {
    title: 'Catálogo',
    items: [
      { label: 'Produtos', href: '/admin/produtos', icon: Package },
      { label: 'Marcas', href: '/admin/marcas', icon: Tag },
      { label: 'Categorias', href: '/admin/categorias', icon: FolderTree },
      { label: 'Estoque', href: '/admin/estoque', icon: Boxes },
    ],
  },
  {
    title: 'Vendas',
    items: [
      { label: 'Pedidos', href: '/admin/pedidos', icon: ShoppingBag },
      { label: 'Ordens de serviço', href: '/admin/ordens-servico', icon: Wrench },
      { label: 'Catálogo de serviços', href: '/admin/catalogo-servicos', icon: ClipboardList },
      { label: 'Cupons', href: '/admin/cupons', icon: Ticket },
      { label: 'Garantias', href: '/admin/garantias', icon: ShieldCheck },
      { label: 'Políticas de garantia', href: '/admin/politicas-garantia', icon: ShieldCheck },
    ],
  },
  {
    title: 'Pessoas',
    items: [
      { label: 'Clientes', href: '/admin/clientes', icon: Users },
      { label: 'Usuários', href: '/admin/usuarios', icon: UserCog },
    ],
  },
  {
    title: 'Loja',
    items: [
      { label: 'Banners', href: '/admin/banners', icon: Image },
      { label: 'Configurações', href: '/admin/configuracoes', icon: Settings },
      { label: 'Logs', href: '/admin/logs', icon: ScrollText },
    ],
  },
];

export function AdminLayout() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink/40">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/entrar" state={{ from: location.pathname }} replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const nav = (
    <nav className="space-y-6 px-3 py-5">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-white/40">{section.title}</p>
          <div className="mt-1.5 space-y-0.5">
            {section.items.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.end}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white',
                    isActive && 'bg-white/10 text-white',
                  )
                }
              >
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );

  const logoHeader = (
    <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-flash text-ink">
        <Zap size={16} fill="currentColor" />
      </span>
      <span className="font-display text-sm font-bold">Admin · Flash Cell</span>
    </div>
  );

  const backToStoreLink = (
    <div className="border-t border-white/10 px-5 py-4">
      <Link to="/" className="text-xs text-white/50 hover:text-white">
        ← Voltar para a loja
      </Link>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-paper">
      {/* Sidebar desktop — inalterada */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-ink text-white lg:block">
        {logoHeader}
        {nav}
        {backToStoreLink}
      </aside>

      {/* Cabeçalho mobile com botão de menu — só aparece abaixo de lg */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-ink px-4 text-white lg:hidden">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-white/10"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-flash text-ink">
          <Zap size={14} fill="currentColor" />
        </span>
        <span className="font-display text-sm font-bold">Admin · Flash Cell</span>
      </div>

      {/* Gaveta mobile — overlay + painel deslizante */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/60" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-ink text-white shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-flash text-ink">
                  <Zap size={16} fill="currentColor" />
                </span>
                <span className="font-display text-sm font-bold">Admin · Flash Cell</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10"
                aria-label="Fechar menu"
              >
                <X size={18} />
              </button>
            </div>
            {nav}
            {backToStoreLink}
          </aside>
        </div>
      )}

      <div className="flex-1">
        <Container className="max-w-none px-6 pb-8 pt-8 lg:pt-8">
          <div className="h-14 lg:hidden" /> {/* espaço reservado pro cabeçalho mobile fixo */}
          <Outlet />
        </Container>
      </div>
    </div>
  );
}
