import { Link } from 'react-router-dom';
import { PackageSearch } from 'lucide-react';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useMyOrders } from '@/hooks/useOrders';
import type { OrderStatus } from '@/types/api';

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  processing: 'Em processamento',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
};

export function MyOrders() {
  const { orders, isLoading, error } = useMyOrders();

  return (
    <Container className="py-10">
      <h1 className="font-display text-3xl font-bold text-ink">Meus pedidos</h1>

      {isLoading ? (
        <div className="flex justify-center py-24 text-ink/40">
          <Spinner className="h-8 w-8" />
        </div>
      ) : error ? (
        <p className="mt-6 text-sm text-destructive">{error}</p>
      ) : !orders || orders.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-lg border border-dashed border-border py-16 text-center">
          <PackageSearch size={36} className="text-ink/20" strokeWidth={1.5} />
          <p className="mt-3 text-sm font-medium text-ink">Você ainda não fez nenhum pedido.</p>
          <Link to="/catalogo" className="mt-5">
            <Button variant="primary">Ir para o catálogo</Button>
          </Link>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-lg border border-border">
          {orders.map((order) => (
            <li key={order.id}>
              <Link to={`/pedidos/${order.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-ink/5">
                <div>
                  <p className="font-mono text-sm font-semibold text-ink">{order.number}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                </div>
                <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand">
                  {STATUS_LABEL[order.status]}
                </span>
                <span className="font-mono text-sm font-semibold text-ink">{formatBRL(order.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
