import { useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAdminCrud } from '@/admin/hooks/useAdminCrud';
import { Modal } from '@/admin/components/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import type { Banner } from '@/types/api';

const POSITION_LABEL: Record<Banner['position'], string> = {
  home_top: 'Home — topo',
  home_middle: 'Home — meio',
  home_bottom: 'Home — rodapé',
  sidebar: 'Barra lateral',
  category: 'Página de categoria',
};

const emptyForm = { title: '', subtitle: '', imageUrl: '', linkUrl: '', position: 'home_top' as Banner['position'] };

export function AdminBanners() {
  const { items: banners, isLoading, error, create, update, remove } = useAdminCrud<Banner>('/banners', {
    defaultParams: { perPage: '50' },
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(banner: Banner) {
    setEditing(banner);
    setForm({
      title: banner.title,
      subtitle: banner.subtitle ?? '',
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl ?? '',
      position: banner.position,
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);
    const payload = {
      title: form.title,
      subtitle: form.subtitle || undefined,
      imageUrl: form.imageUrl,
      linkUrl: form.linkUrl || undefined,
      position: form.position,
    };
    try {
      if (editing) await update(editing.id, payload);
      else await create(payload);
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar banner.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink">Banners</h1>
        <Button onClick={openCreate}><Plus size={16} /> Novo banner</Button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-16 text-ink/40"><Spinner className="h-6 w-6" /></div>
        ) : error ? (
          <p className="col-span-full text-sm text-destructive">{error}</p>
        ) : !banners || banners.length === 0 ? (
          <p className="col-span-full rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhum banner cadastrado ainda.
          </p>
        ) : (
          banners.map((banner) => (
            <div key={banner.id} className="overflow-hidden rounded-lg border border-border bg-white">
              <div className="aspect-video bg-brand-light">
                <img src={banner.imageUrl} alt={banner.title} className="h-full w-full object-cover" />
              </div>
              <div className="p-3">
                <p className="font-medium text-ink">{banner.title}</p>
                <p className="text-xs text-muted-foreground">{POSITION_LABEL[banner.position]}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className={banner.isActive ? 'text-xs text-success' : 'text-xs text-muted-foreground'}>
                    {banner.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                  <div>
                    <button onClick={() => openEdit(banner)} className="p-1 text-ink/50 hover:text-ink"><Pencil size={14} /></button>
                    {banner.isActive && (
                      <button onClick={() => remove(banner.id)} className="p-1 text-ink/50 hover:text-destructive"><Trash2 size={14} /></button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar banner' : 'Novo banner'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <Input placeholder="Subtítulo (opcional)" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
          <Input placeholder="URL da imagem" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} required />
          <Input placeholder="Link ao clicar (opcional)" value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} />
          <select
            className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
            value={form.position}
            onChange={(e) => setForm({ ...form, position: e.target.value as Banner['position'] })}
          >
            {Object.entries(POSITION_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button type="submit" className="w-full" disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</Button>
        </form>
      </Modal>
    </div>
  );
}
