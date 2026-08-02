import { useEffect, useState } from 'react';
import { DollarSign, ShoppingBag, PackageX, Wrench, Users, Package } from 'lucide-react';
import { StatCard } from '@/admin/components/stat-card';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import type { ApiOk, DashboardStats } from '@/types/api';

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get<ApiOk<DashboardStats>>('/dashboard/stats')
      .then((res) => setStats(res.data))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24 text-ink/40">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Vendas registradas — como o módulo de pagamentos ainda não está integrado, este valor conta pedidos criados, não necessariamente pagos.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard icon={DollarSign} label="Vendas registradas" value={formatBRL(stats.totalSales)} />
        <StatCard icon={ShoppingBag} label="Pedidos" value={String(stats.ordersCount)} />
        <StatCard icon={Package} label="Produtos ativos" value={String(stats.activeProductsCount)} />
        <StatCard icon={PackageX} label="Estoque baixo" value={String(stats.lowStockCount)} tone={stats.lowStockCount > 0 ? 'warning' : 'default'} />
        <StatCard icon={Wrench} label="OS em aberto" value={String(stats.openServiceOrdersCount)} />
        <StatCard icon={Users} label="Clientes ativos" value={String(stats.customersCount)} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-white p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">Pedidos por status</h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            {Object.entries(stats.ordersByStatus).map(([status, count]) => (
              <li key={status} className="flex justify-between text-ink/70">
                <span className="capitalize">{status}</span>
                <span className="font-mono font-medium text-ink">{count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-border bg-white p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">OS por status</h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            {Object.entries(stats.serviceOrdersByStatus).map(([status, count]) => (
              <li key={status} className="flex justify-between text-ink/70">
                <span className="capitalize">{status.replace('_', ' ')}</span>
                <span className="font-mono font-medium text-ink">{count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
