import { useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAdminCrud } from '@/admin/hooks/useAdminCrud';
import { Modal } from '@/admin/components/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import type { Coupon } from '@/types/api';

const emptyForm = { code: '', description: '', type: 'percentage' as 'percentage' | 'fixed', value: '', minOrderValue: '', maxDiscount: '' };

export function AdminCoupons() {
  const { items: coupons, isLoading, error, create, update, remove } = useAdminCrud<Coupon>('/coupons', {
    defaultParams: { perPage: '50' },
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(coupon: Coupon) {
    setEditing(coupon);
    setForm({
      code: coupon.code,
      description: coupon.description ?? '',
      type: coupon.type,
      value: String(coupon.value),
      minOrderValue: coupon.minOrderValue !== null ? String(coupon.minOrderValue) : '',
      maxDiscount: coupon.maxDiscount !== null ? String(coupon.maxDiscount) : '',
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);
    const payload = {
      code: form.code,
      description: form.description || undefined,
      type: form.type,
      value: Number(form.value),
      minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : undefined,
      maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
    };
    try {
      if (editing) await update(editing.id, payload);
      else await create(payload);
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar cupom.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink">Cupons</h1>
        <Button onClick={openCreate}><Plus size={16} /> Novo cupom</Button>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-white">
        {isLoading ? (
          <div className="flex justify-center py-16 text-ink/40"><Spinner className="h-6 w-6" /></div>
        ) : error ? (
          <p className="p-6 text-sm text-destructive">{error}</p>
        ) : !coupons || coupons.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Nenhum cupom cadastrado ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-ink/[0.02] text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-4 py-3">Código</th><th className="px-4 py-3">Desconto</th><th className="px-4 py-3">Usos</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {coupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td className="px-4 py-3 font-mono font-medium text-ink">{coupon.code}</td>
                  <td className="px-4 py-3">{coupon.type === 'percentage' ? `${coupon.value}%` : `R$ ${coupon.value}`}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{coupon.usageCount}{coupon.usageLimit ? `/${coupon.usageLimit}` : ''}</td>
                  <td className="px-4 py-3">
                    <span className={coupon.isActive ? 'text-success' : 'text-muted-foreground'}>{coupon.isActive ? 'Ativo' : 'Inativo'}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(coupon)} className="p-1.5 text-ink/50 hover:text-ink" aria-label="Editar"><Pencil size={15} /></button>
                    {coupon.isActive && (
                      <button onClick={() => remove(coupon.id)} className="p-1.5 text-ink/50 hover:text-destructive" aria-label="Desativar"><Trash2 size={15} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar cupom' : 'Novo cupom'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input placeholder="Código (ex: BEMVINDO10)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required disabled={!!editing} />
          <Input placeholder="Descrição (opcional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <select className="h-10 rounded-md border border-input bg-white px-3 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'percentage' | 'fixed' })}>
              <option value="percentage">Percentual (%)</option>
              <option value="fixed">Valor fixo (R$)</option>
            </select>
            <Input placeholder="Valor" type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Pedido mínimo (opcional)" type="number" step="0.01" value={form.minOrderValue} onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })} />
            <Input placeholder="Desconto máximo (opcional)" type="number" step="0.01" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} />
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button type="submit" className="w-full" disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</Button>
        </form>
      </Modal>
    </div>
  );
}
