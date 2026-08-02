import { useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAdminCrud } from '@/admin/hooks/useAdminCrud';
import { Modal } from '@/admin/components/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import type { Category } from '@/types/api';

export function AdminCategories() {
  // format=flat: a árvore hierárquica é ótima para a loja, mas para a tabela
  // administrativa e o seletor de "categoria pai" uma lista plana é mais simples.
  const { items: categories, isLoading, error, create, update, remove } = useAdminCrud<Category>('/categories', {
    defaultParams: { format: 'flat' },
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setName('');
    setParentId('');
    setSortOrder('0');
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setName(category.name);
    setParentId(category.parentId ?? '');
    setSortOrder(String(category.sortOrder));
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);
    try {
      const payload = { name, parentId: parentId || undefined, sortOrder: Number(sortOrder) };
      if (editing) await update(editing.id, payload);
      else await create(payload);
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar categoria.');
    } finally {
      setIsSaving(false);
    }
  }

  function parentName(id: string | null): string {
    if (!id) return '—';
    return categories?.find((c) => c.id === id)?.name ?? '—';
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink">Categorias</h1>
        <Button onClick={openCreate}>
          <Plus size={16} /> Nova categoria
        </Button>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-white">
        {isLoading ? (
          <div className="flex justify-center py-16 text-ink/40"><Spinner className="h-6 w-6" /></div>
        ) : error ? (
          <p className="p-6 text-sm text-destructive">{error}</p>
        ) : !categories || categories.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Nenhuma categoria cadastrada ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-ink/[0.02] text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-4 py-3">Nome</th><th className="px-4 py-3">Categoria pai</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categories.map((category) => (
                <tr key={category.id}>
                  <td className="px-4 py-3 font-medium text-ink">{category.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{parentName(category.parentId)}</td>
                  <td className="px-4 py-3">
                    <span className={category.isActive ? 'text-success' : 'text-muted-foreground'}>{category.isActive ? 'Ativa' : 'Inativa'}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(category)} className="p-1.5 text-ink/50 hover:text-ink" aria-label="Editar"><Pencil size={15} /></button>
                    {category.isActive && (
                      <button onClick={() => remove(category.id)} className="p-1.5 text-ink/50 hover:text-destructive" aria-label="Desativar"><Trash2 size={15} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar categoria' : 'Nova categoria'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input placeholder="Nome da categoria" value={name} onChange={(e) => setName(e.target.value)} required />

          <select
            className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          >
            <option value="">Categoria raiz (sem pai)</option>
            {(categories ?? [])
              .filter((c) => c.id !== editing?.id) // não pode ser pai de si mesma
              .map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
          </select>

          <Input placeholder="Ordem de exibição" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />

          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button type="submit" className="w-full" disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</Button>
        </form>
      </Modal>
    </div>
  );
}
