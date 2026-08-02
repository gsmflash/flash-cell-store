import { useState, type FormEvent } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import { Modal } from '@/admin/components/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useAdminCrud } from '@/admin/hooks/useAdminCrud';
import { useProducts } from '@/hooks/useCatalog';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { StockMovementType } from '@/types/api';

const MOVEMENT_LABEL: Record<StockMovementType, string> = {
  in: 'Entrada',
  out: 'Saída',
  adjustment: 'Ajuste',
  return: 'Devolução',
  loss: 'Perda',
};

interface StockRow {
  productId: string;
  productName: string;
  productSku: string | null;
  quantity: number;
  minQuantity: number;
}

export function AdminStock() {
  // Visão geral: todos os produtos com estoque, não só os com saldo baixo.
  // Antes esta tela só mostrava GET /stock/low — se você abastecesse um
  // produto e ele saísse do alerta, ele simplesmente sumia da lista, dando
  // a impressão de que o registro não tinha funcionado (quando na verdade
  // tinha: o 201 Created confirma isso).
  const { items: stockRows, isLoading, error, params, setParams, refresh } = useAdminCrud<StockRow & { id: string }>('/stock', {
    defaultParams: { perPage: '100' },
  });
  const { data: products } = useProducts({ perPage: 200 });

  const [modalOpen, setModalOpen] = useState(false);
  const [productId, setProductId] = useState('');
  const [type, setType] = useState<StockMovementType>('in');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [justRegistered, setJustRegistered] = useState<string | null>(null);

  function openCreate() {
    setProductId('');
    setType('in');
    setQuantity('');
    setNotes('');
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);
    try {
      await api.post('/stock/movements', { productId, type, quantity: Number(quantity), notes: notes || undefined });
      setModalOpen(false);
      await refresh();
      setJustRegistered(productId);
      setTimeout(() => setJustRegistered(null), 3000);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao registrar movimentação.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink">Estoque</h1>
        <Button onClick={openCreate}>
          <Plus size={16} /> Registrar movimentação
        </Button>
      </div>

      <Input
        placeholder="Buscar por nome do produto..."
        className="mt-4 max-w-sm"
        onChange={(e) => setParams({ ...params, search: e.target.value })}
      />

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-white">
        {isLoading ? (
          <div className="flex justify-center py-16 text-ink/40"><Spinner className="h-6 w-6" /></div>
        ) : error ? (
          <p className="p-6 text-sm text-destructive">{error}</p>
        ) : !stockRows || stockRows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            Nenhum produto com controle de estoque ainda. Produtos marcados como "serviço" não aparecem aqui.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-ink/[0.02] text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Saldo atual</th>
                <th className="px-4 py-3">Mínimo</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stockRows.map((row) => {
                const isLow = row.quantity <= row.minQuantity;
                return (
                  <tr key={row.productId} className={cn(justRegistered === row.productId && 'bg-success/5')}>
                    <td className="px-4 py-3 font-medium text-ink">{row.productName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.productSku ?? '—'}</td>
                    <td className={cn('px-4 py-3 font-mono font-semibold', isLow ? 'text-destructive' : 'text-ink')}>
                      {row.quantity}
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{row.minQuantity}</td>
                    <td className="px-4 py-3">
                      {isLow ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-destructive">
                          <AlertTriangle size={13} /> Estoque baixo
                        </span>
                      ) : (
                        <span className="text-xs text-success">OK</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar movimentação de estoque">
        <form onSubmit={handleSubmit} className="space-y-3">
          <select
            className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            required
          >
            <option value="">Selecione um produto</option>
            {(products ?? []).map((p) => (
              <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-3">
            <select
              className="h-10 rounded-md border border-input bg-white px-3 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as StockMovementType)}
            >
              {Object.entries(MOVEMENT_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <Input type="number" placeholder="Quantidade" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
          </div>

          <Input placeholder="Observação (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button type="submit" className="w-full" disabled={isSaving}>{isSaving ? 'Registrando...' : 'Registrar'}</Button>
        </form>
      </Modal>
    </div>
  );
}
