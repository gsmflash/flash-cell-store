import { useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAdminCrud } from '@/admin/hooks/useAdminCrud';
import { Modal } from '@/admin/components/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import type { Brand } from '@/types/api';

export function AdminBrands() {
  const { items: brands, isLoading, error, create, update, remove } = useAdminCrud<Brand>('/brands', {
    defaultParams: { perPage: '100' },
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setName('');
    setLogoUrl('');
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(brand: Brand) {
    setEditing(brand);
    setName(brand.name);
    setLogoUrl(brand.logoUrl ?? '');
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);
    try {
      const payload = { name, logoUrl: logoUrl || undefined };
      if (editing) await update(editing.id, payload);
      else await create(payload);
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar marca.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink">Marcas</h1>
        <Button onClick={openCreate}>
          <Plus size={16} /> Nova marca
        </Button>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-white">
        {isLoading ? (
          <div className="flex justify-center py-16 text-ink/40"><Spinner className="h-6 w-6" /></div>
        ) : error ? (
          <p className="p-6 text-sm text-destructive">{error}</p>
        ) : !brands || brands.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Nenhuma marca cadastrada ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-ink/[0.02] text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-4 py-3">Nome</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {brands.map((brand) => (
                <tr key={brand.id}>
                  <td className="px-4 py-3 font-medium text-ink">{brand.name}</td>
                  <td className="px-4 py-3">
                    <span className={brand.isActive ? 'text-success' : 'text-muted-foreground'}>{brand.isActive ? 'Ativa' : 'Inativa'}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(brand)} className="p-1.5 text-ink/50 hover:text-ink" aria-label="Editar"><Pencil size={15} /></button>
                    {brand.isActive && (
                      <button onClick={() => remove(brand.id)} className="p-1.5 text-ink/50 hover:text-destructive" aria-label="Desativar"><Trash2 size={15} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar marca' : 'Nova marca'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input placeholder="Nome da marca" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input placeholder="URL do logo (opcional)" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button type="submit" className="w-full" disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</Button>
        </form>
      </Modal>
    </div>
  );
}
