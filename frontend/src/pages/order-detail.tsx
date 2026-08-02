import { Link, useLocation, useParams } from 'react-router-dom';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useOrder } from '@/hooks/useOrders';
import type { OrderStatus } from '@/types/api';

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

const CANCELLABLE: OrderStatus[] = ['pending', 'confirmed', 'processing'];

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const justPlaced = (location.state as { justPlaced?: boolean } | null)?.justPlaced ?? false;
  const { order, isLoading, error, cancelOrder } = useOrder(id);

  if (isLoading) {
    return (
      <Container className="flex justify-center py-24 text-ink/40">
        <Spinner className="h-8 w-8" />
      </Container>
    );
  }

  if (error || !order) {
    return (
      <Container className="py-24 text-center">
        <p className="font-display text-xl font-semibold text-ink">Pedido não encontrado</p>
        <Link to="/meus-pedidos" className="mt-6 inline-block">
          <Button variant="outline">Ver meus pedidos</Button>
        </Link>
      </Container>
    );
  }

  return (
    <Container className="py-10">
      {justPlaced && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-success/30 bg-success/5 p-4">
          <CheckCircle2 size={22} className="shrink-0 text-success" />
          <div>
            <p className="text-sm font-semibold text-ink">Pedido confirmado!</p>
            <p className="text-sm text-muted-foreground">Você vai acompanhar o status por aqui.</p>
          </div>
        </div>
      )}

      <nav className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link to="/meus-pedidos" className="hover:text-ink">Meus pedidos</Link>
        <ChevronRight size={12} />
        <span className="text-ink">{order.number}</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-ink">Pedido {order.number}</h1>
        <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand">
          {STATUS_LABEL[order.status]}
        </span>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">Itens</h2>
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between p-4 text-sm">
                <span>{item.quantity}x {item.productName}</span>
                <span className="font-mono font-medium">{formatBRL(item.total)}</span>
              </li>
            ))}
          </ul>

          {order.cancellationReason && (
            <p className="mt-4 text-sm text-destructive">Motivo do cancelamento: {order.cancellationReason}</p>
          )}
        </div>

        <aside className="h-fit rounded-lg border border-border p-5">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-ink/70">
              <span>Subtotal</span>
              <span className="font-mono">{formatBRL(order.subtotal)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-success">
                <span>Desconto</span>
                <span className="font-mono">-{formatBRL(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-ink/70">
              <span>Frete</span>
              <span className="font-mono">{order.shippingCost > 0 ? formatBRL(order.shippingCost) : 'Grátis'}</span>
            </div>
          </div>
          <div className="mt-3 flex justify-between border-t border-border pt-3">
            <span className="font-semibold text-ink">Total</span>
            <span className="font-mono text-lg font-bold text-ink">{formatBRL(order.total)}</span>
          </div>

          {CANCELLABLE.includes(order.status) && (
            <>
              {order.status === 'pending' && (
                <Link to={`/pedidos/${order.id}/pagamento`}>
                  <Button variant="primary" className="mt-4 w-full">Pagar agora</Button>
                </Link>
              )}
              <Button
                variant="outline"
                className="mt-2 w-full border-destructive/40 text-destructive hover:bg-destructive/5"
                onClick={() => cancelOrder('Cancelado pelo cliente')}
              >
                Cancelar pedido
              </Button>
            </>
          )}
        </aside>
      </div>
    </Container>
  );
}
