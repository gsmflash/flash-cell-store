import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Modal } from '@/admin/components/modal';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useAdminCrud } from '@/admin/hooks/useAdminCrud';
import { api } from '@/lib/api';
import type { Order, OrderStatus } from '@/types/api';

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  processing: 'Em processamento',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
};

// Este painel só avança o status — não cancela (cancelamento reverte
// estoque e tem seu próprio endpoint, usado pelo cliente).
const ADVANCEABLE_STATUSES: OrderStatus[] = ['confirmed', 'processing', 'shipped', 'delivered'];

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function AdminOrders() {
  const { items: orders, isLoading, error, refresh } = useAdminCrud<Order>('/orders', {
    defaultParams: { perPage: '50' },
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [status, setStatus] = useState<OrderStatus>('confirmed');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openEdit(order: Order) {
    setEditing(order);
    setStatus(order.status);
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit() {
    if (!editing) return;
    setIsSaving(true);
    setFormError(null);
    try {
      await api.patch(`/orders/${editing.id}/status`, { status });
      setModalOpen(false);
      await refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao atualizar status.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRefund(order: Order) {
    if (!confirm(`Reembolsar o pedido ${order.number}? Isso não pode ser desfeito.`)) return;
    try {
      const paymentsRes = await api.get<{ data: { id: string; status: string }[] }>(`/payments/orders/${order.id}`);
      const paidPayment = paymentsRes.data.find((p) => p.status === 'paid');
      if (!paidPayment) {
        alert('Nenhum pagamento confirmado encontrado para este pedido.');
        return;
      }
      await api.post(`/payments/${paidPayment.id}/refund`);
      await refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao reembolsar.');
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">Pedidos</h1>

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-white">
        {isLoading ? (
          <div className="flex justify-center py-16 text-ink/40"><Spinner className="h-6 w-6" /></div>
        ) : error ? (
          <p className="p-6 text-sm text-destructive">{error}</p>
        ) : !orders || orders.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Nenhum pedido registrado ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-ink/[0.02] text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Número</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3 font-mono font-medium text-ink">{order.number}</td>
                  <td className="px-4 py-3 font-mono">{formatBRL(order.total)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-brand-light px-2.5 py-1 text-xs font-semibold text-brand">
                      {STATUS_LABEL[order.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {order.status === 'pending' || ADVANCEABLE_STATUSES.includes(order.status) ? (
                      <button onClick={() => openEdit(order)} className="p-1.5 text-ink/50 hover:text-ink" aria-label="Editar status">
                        <Pencil size={15} />
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                    {['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status) && (
                      <button onClick={() => handleRefund(order)} className="ml-2 text-xs font-medium text-destructive hover:underline">
                        Reembolsar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`Pedido ${editing?.number ?? ''}`}>
        <div className="space-y-3">
          <label className="text-sm font-medium text-ink">Novo status</label>
          <select
            className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus)}
          >
            {ADVANCEABLE_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Cancelamento não é feito por aqui — ele reverte o estoque automaticamente e é iniciado pelo próprio pedido.
          </p>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button onClick={handleSubmit} className="w-full" disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Atualizar status'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
