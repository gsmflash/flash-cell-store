import { useState } from 'react';
import { useAdminCrud } from '@/admin/hooks/useAdminCrud';
import { Modal } from '@/admin/components/modal';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import type { Warranty } from '@/types/api';

const TYPE_LABEL: Record<Warranty['type'], string> = {
  manufacturer: 'Fabricante',
  store: 'Loja',
  service: 'Serviço',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

export function AdminWarranties() {
  const { items: warranties, isLoading, error, refresh } = useAdminCrud<Warranty>('/warranties', {
    defaultParams: { perPage: '50', includeInactive: 'true' },
  });

  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [target, setTarget] = useState<Warranty | null>(null);
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function openVoid(warranty: Warranty) {
    setTarget(warranty);
    setReason('');
    setVoidModalOpen(true);
  }

  async function handleVoid() {
    if (!target) return;
    setIsSaving(true);
    try {
      await api.post(`/warranties/${target.id}/void`, { reason });
      setVoidModalOpen(false);
      await refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao anular garantia.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">Garantias</h1>

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-white">
        {isLoading ? (
          <div className="flex justify-center py-16 text-ink/40"><Spinner className="h-6 w-6" /></div>
        ) : error ? (
          <p className="p-6 text-sm text-destructive">{error}</p>
        ) : !warranties || warranties.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Nenhuma garantia registrada ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-ink/[0.02] text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Válida até</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {warranties.map((warranty) => (
                <tr key={warranty.id}>
                  <td className="px-4 py-3 text-ink">{warranty.description}</td>
                  <td className="px-4 py-3 text-ink/70">{TYPE_LABEL[warranty.type]}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{formatDate(warranty.endDate)}</td>
                  <td className="px-4 py-3">
                    <span className={warranty.isValid ? 'text-success' : 'text-muted-foreground'}>
                      {warranty.isValid ? 'Válida' : 'Encerrada'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {warranty.isActive && (
                      <button onClick={() => openVoid(warranty)} className="text-xs font-medium text-destructive hover:underline">
                        Anular
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={voidModalOpen} onClose={() => setVoidModalOpen(false)} title="Anular garantia">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Isso encerra a garantia permanentemente. Explique o motivo:</p>
          <textarea
            className="min-h-24 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo da anulação"
          />
          <Button onClick={handleVoid} disabled={isSaving || !reason.trim()} className="w-full">
            {isSaving ? 'Anulando...' : 'Confirmar anulação'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
