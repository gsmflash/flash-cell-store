import { useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAdminCrud } from '@/admin/hooks/useAdminCrud';
import { Modal } from '@/admin/components/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import type { ServiceCatalogItem } from '@/types/api';

const DEVICE_TYPE_LABEL: Record<string, string> = {
  smartphone: 'Smartphone',
  tablet: 'Tablet',
  smartwatch: 'Smartwatch',
  laptop: 'Notebook',
  desktop: 'Desktop',
  other: 'Outro',
};

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const emptyForm = { name: '', description: '', price: '', estimatedMinutes: '', deviceType: '' };

export function AdminServiceCatalog() {
  const { items: services, isLoading, error, create, update, remove } = useAdminCrud<ServiceCatalogItem>('/service-catalog', {
    defaultParams: { perPage: '100' },
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceCatalogItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(service: ServiceCatalogItem) {
    setEditing(service);
    setForm({
      name: service.name,
      description: service.description ?? '',
      price: String(service.price),
      estimatedMinutes: service.estimatedMinutes !== null ? String(service.estimatedMinutes) : '',
      deviceType: service.deviceType ?? '',
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    const payload = {
      name: form.name,
      description: form.description || undefined,
      price: Number(form.price),
      estimatedMinutes: form.estimatedMinutes ? Number(form.estimatedMinutes) : undefined,
      deviceType: form.deviceType || undefined,
    };

    try {
      if (editing) await update(editing.id, payload);
      else await create(payload);
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar serviço.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink">Catálogo de serviços</h1>
        <Button onClick={openCreate}>
          <Plus size={16} /> Novo serviço
        </Button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Os serviços daqui aparecem na hora de montar o orçamento de uma ordem de serviço.
      </p>

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-white">
        {isLoading ? (
          <div className="flex justify-center py-16 text-ink/40"><Spinner className="h-6 w-6" /></div>
        ) : error ? (
          <p className="p-6 text-sm text-destructive">{error}</p>
        ) : !services || services.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Nenhum serviço cadastrado ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-ink/[0.02] text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Aparelho</th>
                <th className="px-4 py-3">Preço</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {services.map((service) => (
                <tr key={service.id}>
                  <td className="px-4 py-3 font-medium text-ink">{service.name}</td>
                  <td className="px-4 py-3 text-ink/70">{service.deviceType ? DEVICE_TYPE_LABEL[service.deviceType] : 'Qualquer'}</td>
                  <td className="px-4 py-3 font-mono">{formatBRL(service.price)}</td>
                  <td className="px-4 py-3">
                    <span className={service.isActive ? 'text-success' : 'text-muted-foreground'}>
                      {service.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(service)} className="p-1.5 text-ink/50 hover:text-ink" aria-label="Editar">
                      <Pencil size={15} />
                    </button>
                    {service.isActive && (
                      <button onClick={() => remove(service.id)} className="p-1.5 text-ink/50 hover:text-destructive" aria-label="Desativar">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar serviço' : 'Novo serviço'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input placeholder="Nome do serviço (ex: Troca de tela)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />

          <textarea
            placeholder="Descrição (opcional)"
            className="min-h-20 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Preço" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            <Input placeholder="Tempo estimado (min)" type="number" value={form.estimatedMinutes} onChange={(e) => setForm({ ...form, estimatedMinutes: e.target.value })} />
          </div>

          <select
            className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
            value={form.deviceType}
            onChange={(e) => setForm({ ...form, deviceType: e.target.value })}
          >
            <option value="">Qualquer tipo de aparelho</option>
            {Object.entries(DEVICE_TYPE_LABEL).map(([value, label]) => (
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
