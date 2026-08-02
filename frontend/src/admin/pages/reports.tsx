import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { StatCard } from '@/admin/components/stat-card';
import { DollarSign, ShoppingBag, Receipt, Wrench, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import type { ApiOk } from '@/types/api';

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function todayMinus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

interface SalesReport {
  totalRevenue: number;
  orderCount: number;
  averageTicket: number;
  byDay: { date: string; revenue: number; orderCount: number }[];
  topProducts: { productName: string; quantitySold: number; revenue: number }[];
}

interface ServiceOrdersReport {
  totalOrders: number;
  byStatus: Record<string, number>;
  averageCompletionDays: number | null;
}

export function AdminReports() {
  const [from, setFrom] = useState(todayMinus(30));
  const [to, setTo] = useState(todayMinus(0));
  const [sales, setSales] = useState<SalesReport | null>(null);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrdersReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadReports() {
    setIsLoading(true);
    setError(null);
    try {
      const [salesRes, serviceRes] = await Promise.all([
        api.get<ApiOk<SalesReport>>('/reports/sales', { params: { from, to } }),
        api.get<ApiOk<ServiceOrdersReport>>('/reports/service-orders', { params: { from, to } }),
      ]);
      setSales(salesRes.data);
      setServiceOrders(serviceRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar relatórios.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxDayRevenue = sales ? Math.max(1, ...sales.byDay.map((d) => d.revenue)) : 1;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">Relatórios</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Vendas contam pedidos criados no período, não cancelados — como o pagamento ainda não é confirmado
        automaticamente de forma testada (ver Etapa 9), isso é uma métrica de "vendas registradas".
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">De</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Até</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1" />
        </div>
        <Button onClick={loadReports} disabled={isLoading}>{isLoading ? 'Carregando...' : 'Atualizar'}</Button>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {isLoading && !sales ? (
        <div className="flex justify-center py-24 text-ink/40"><Spinner className="h-8 w-8" /></div>
      ) : (
        <>
          {sales && (
            <section className="mt-6">
              <h2 className="font-display text-lg font-semibold text-ink">Vendas</h2>
              <div className="mt-3 grid grid-cols-3 gap-4">
                <StatCard icon={DollarSign} label="Total no período" value={formatBRL(sales.totalRevenue)} />
                <StatCard icon={ShoppingBag} label="Pedidos" value={String(sales.orderCount)} />
                <StatCard icon={Receipt} label="Ticket médio" value={formatBRL(sales.averageTicket)} />
              </div>

              {sales.byDay.length > 0 && (
                <div className="mt-4 rounded-lg border border-border bg-white p-5">
                  <h3 className="text-sm font-semibold text-ink">Vendas por dia</h3>
                  <div className="mt-4 space-y-2">
                    {sales.byDay.map((day) => (
                      <div key={day.date} className="flex items-center gap-3 text-xs">
                        <span className="w-10 shrink-0 font-mono text-muted-foreground">{formatDate(day.date)}</span>
                        <div className="h-5 flex-1 overflow-hidden rounded bg-ink/5">
                          <div
                            className="h-full rounded bg-brand"
                            style={{ width: `${(day.revenue / maxDayRevenue) * 100}%` }}
                          />
                        </div>
                        <span className="w-24 shrink-0 text-right font-mono text-ink">{formatBRL(day.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sales.topProducts.length > 0 && (
                <div className="mt-4 rounded-lg border border-border bg-white p-5">
                  <h3 className="text-sm font-semibold text-ink">Mais vendidos no período</h3>
                  <table className="mt-3 w-full text-sm">
                    <tbody className="divide-y divide-border">
                      {sales.topProducts.map((p) => (
                        <tr key={p.productName}>
                          <td className="py-2 text-ink">{p.productName}</td>
                          <td className="py-2 text-right font-mono text-muted-foreground">{p.quantitySold}x</td>
                          <td className="py-2 text-right font-mono text-ink">{formatBRL(p.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {serviceOrders && (
            <section className="mt-8">
              <h2 className="font-display text-lg font-semibold text-ink">Ordens de serviço</h2>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <StatCard icon={Wrench} label="OS no período" value={String(serviceOrders.totalOrders)} />
                <StatCard
                  icon={Clock}
                  label="Tempo médio de conclusão"
                  value={serviceOrders.averageCompletionDays !== null ? `${serviceOrders.averageCompletionDays} dias` : '—'}
                />
              </div>

              <div className="mt-4 rounded-lg border border-border bg-white p-5">
                <h3 className="text-sm font-semibold text-ink">Por status</h3>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {Object.entries(serviceOrders.byStatus).map(([status, count]) => (
                    <li key={status} className="flex justify-between text-ink/70">
                      <span className="capitalize">{status.replace('_', ' ')}</span>
                      <span className="font-mono font-medium text-ink">{count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
