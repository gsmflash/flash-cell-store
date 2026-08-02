import { useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAdminCrud } from '@/admin/hooks/useAdminCrud';
import { Modal } from '@/admin/components/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import type { Customer } from '@/types/api';

const emptyForm = { name: '', email: '', phone: '', document: '' };

export function AdminCustomers() {
  const { items: customers, isLoading, error, params, setParams, create, update, remove } = useAdminCrud<Customer>('/customers', {
    defaultParams: { perPage: '50' },
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(customer: Customer) {
    setEditing(customer);
    setForm({
      name: customer.name,
      email: customer.email ?? '',
      phone: customer.phone ?? '',
      document: customer.document ?? '',
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
      email: form.email || undefined,
      phone: form.phone || undefined,
      document: form.document || undefined,
    };
    try {
      if (editing) await update(editing.id, payload);
      else await create(payload);
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar cliente.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink">Clientes</h1>
        <Button onClick={openCreate}>
          <Plus size={16} /> Novo cliente
        </Button>
      </div>

      <Input
        placeholder="Buscar por nome, telefone ou documento..."
        className="mt-4 max-w-sm"
        onChange={(e) => setParams({ ...params, search: e.target.value })}
      />

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-white">
        {isLoading ? (
          <div className="flex justify-center py-16 text-ink/40"><Spinner className="h-6 w-6" /></div>
        ) : error ? (
          <p className="p-6 text-sm text-destructive">{error}</p>
        ) : !customers || customers.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Nenhum cliente cadastrado ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-ink/[0.02] text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td className="px-4 py-3 font-medium text-ink">{customer.name}</td>
                  <td className="px-4 py-3 text-ink/70">{customer.email ?? '—'}</td>
                  <td className="px-4 py-3 text-ink/70">{customer.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={customer.isActive ? 'text-success' : 'text-muted-foreground'}>
                      {customer.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(customer)} className="p-1.5 text-ink/50 hover:text-ink" aria-label="Editar">
                      <Pencil size={15} />
                    </button>
                    {customer.isActive && (
                      <button onClick={() => remove(customer.id)} className="p-1.5 text-ink/50 hover:text-destructive" aria-label="Desativar">
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar cliente' : 'Novo cliente'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input placeholder="Nome completo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input placeholder="E-mail (opcional)" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input placeholder="Telefone (opcional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input placeholder="CPF/CNPJ (opcional)" value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} />
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button type="submit" className="w-full" disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</Button>
        </form>
      </Modal>
    </div>
  );
}
