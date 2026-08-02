import { useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react';
import { useAdminCrud } from '@/admin/hooks/useAdminCrud';
import { Modal } from '@/admin/components/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import type { WarrantyPolicy } from '@/types/api';

const emptyForm = { name: '', description: '', days: '', notes: '' };

function formatDays(days: number): string {
  if (days % 30 === 0 && days >= 30) return `${days} dias (${days / 30} ${days === 30 ? 'mês' : 'meses'})`;
  return `${days} dias`;
}

export function AdminWarrantyPolicies() {
  const { items: policies, isLoading, error, params, setParams, create, update, remove } = useAdminCrud<WarrantyPolicy>(
    '/warranty-policies',
    { defaultParams: { perPage: '50', includeInactive: 'true' } },
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WarrantyPolicy | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(policy: WarrantyPolicy) {
    setEditing(policy);
    setForm({
      name: policy.name,
      description: policy.description ?? '',
      days: String(policy.days),
      notes: policy.notes ?? '',
    });
    setFormError(null);
    setModalOpen(true);
  }

  function flashSuccess(message: string) {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    const days = Number(form.days);
    if (!form.name.trim()) {
      setFormError('Informe o nome da garantia.');
      setIsSaving(false);
      return;
    }
    if (!Number.isFinite(days) || days <= 0) {
      setFormError('O prazo precisa ser um número de dias maior que zero.');
      setIsSaving(false);
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      days,
      notes: form.notes.trim() || undefined,
    };

    try {
      if (editing) {
        await update(editing.id, payload);
        flashSuccess('Garantia atualizada com sucesso.');
      } else {
        await create(payload);
        flashSuccess('Garantia criada com sucesso.');
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar a política de garantia.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive(policy: WarrantyPolicy) {
    try {
      await update(policy.id, { isActive: !policy.isActive });
      flashSuccess(policy.isActive ? 'Garantia desativada.' : 'Garantia reativada.');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao atualizar status.');
    }
  }

  async function handleDelete(policy: WarrantyPolicy) {
    if (!confirm(`Excluir a garantia "${policy.name}"? Produtos vinculados a ela voltam a usar o prazo padrão.`)) return;
    try {
      await remove(policy.id);
      flashSuccess('Garantia excluída.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir.');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Garantias</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Políticas reutilizáveis (ex.: "Garantia Padrão — 90 dias") vinculáveis a produtos.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> Nova garantia
        </Button>
      </div>

      {successMessage && (
        <div className="mt-4 rounded-md border border-success/30 bg-success/10 px-4 py-2.5 text-sm font-medium text-success">
          {successMessage}
        </div>
      )}

      <Input
        placeholder="Buscar por nome..."
        className="mt-4 max-w-sm"
        onChange={(e) => setParams({ ...params, search: e.target.value })}
      />

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-white">
        {isLoading ? (
          <div className="flex justify-center py-16 text-ink/40"><Spinner className="h-6 w-6" /></div>
        ) : error ? (
          <p className="p-6 text-sm text-destructive">{error}</p>
        ) : !policies || policies.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
            <ShieldCheck size={28} className="text-ink/20" />
            Nenhuma garantia cadastrada ainda.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-ink/[0.02] text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Prazo</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {policies.map((policy) => (
                <tr key={policy.id}>
                  <td className="px-4 py-3 font-medium text-ink">{policy.name}</td>
                  <td className="px-4 py-3 font-mono text-ink/80">{formatDays(policy.days)}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-ink/60">{policy.description ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(policy)}
                      className={policy.isActive ? 'text-xs font-medium text-success hover:underline' : 'text-xs font-medium text-muted-foreground hover:underline'}
                    >
                      {policy.isActive ? 'Ativa' : 'Inativa'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(policy)} className="p-1.5 text-ink/50 hover:text-ink" aria-label="Editar">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(policy)} className="p-1.5 text-ink/50 hover:text-destructive" aria-label="Excluir">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar garantia' : 'Nova garantia'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm font-medium text-ink">Nome</label>
            <Input
              className="mt-1.5"
              placeholder="Ex: Garantia Padrão"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-ink">Prazo (em dias)</label>
            <Input
              className="mt-1.5"
              type="number"
              min="1"
              placeholder="Ex: 90"
              value={form.days}
              onChange={(e) => setForm({ ...form, days: e.target.value })}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Pra garantia em meses, multiplique por 30 (ex.: 6 meses = 180 dias).
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-ink">Descrição</label>
            <textarea
              className="mt-1.5 min-h-16 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
              placeholder="O que essa garantia cobre"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-ink">Observações</label>
            <textarea
              className="mt-1.5 min-h-16 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
              placeholder="Observações internas (opcional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button type="submit" className="w-full" disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
