import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, Image as ImageIcon, X, Upload } from 'lucide-react';
import { useAdminCrud } from '@/admin/hooks/useAdminCrud';
import { Modal } from '@/admin/components/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useBrands, useCategories } from '@/hooks/useCatalog';
import { api } from '@/lib/api';
import { resizeImageToBase64 } from '@/lib/imageResize';
import type { ApiOk, Product, ProductDetail, ProductImage, WarrantyPolicy } from '@/types/api';

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const emptyForm = {
  name: '',
  brandId: '',
  categoryId: '',
  warrantyPolicyId: '',
  sku: '',
  sellPrice: '',
  salePrice: '',
  shortDescription: '',
  description: '',
  isFeatured: false,
  isService: false,
};

export function AdminProducts() {
  const { items: products, isLoading, error, params, setParams, create, update, remove } = useAdminCrud<Product>('/products', {
    defaultParams: { perPage: '50' },
  });
  const { data: brands } = useBrands();
  const { data: categories } = useCategories();
  const [warrantyPolicies, setWarrantyPolicies] = useState<WarrantyPolicy[]>([]);

  useEffect(() => {
    api
      .get<ApiOk<WarrantyPolicy[]>>('/warranty-policies', { params: { perPage: '100' } })
      .then((res) => setWarrantyPolicies(res.data))
      .catch(() => setWarrantyPolicies([]));
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ─── Imagens (gestão por URL — upload de arquivo real ainda não existe,
  // ver ROADMAP.md/Etapa 8: exige credenciais reais de Cloudflare R2) ─────
  const [images, setImages] = useState<ProductImage[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isAddingImage, setIsAddingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showUrlOption, setShowUrlOption] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setImages([]);
    setFormError(null);
    setImageError(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setShowUrlOption(false);
    setModalOpen(true);
  }

  async function openEdit(product: Product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      brandId: product.brandId ?? '',
      categoryId: product.categoryId ?? '',
      warrantyPolicyId: product.warrantyPolicyId ?? '',
      sku: product.sku ?? '',
      sellPrice: String(product.sellPrice),
      salePrice: product.salePrice !== null ? String(product.salePrice) : '',
      shortDescription: product.shortDescription ?? '',
      description: product.description ?? '',
      isFeatured: product.isFeatured,
      isService: product.isService,
    });
    setFormError(null);
    setImageError(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setShowUrlOption(false);
    setModalOpen(true);

    // A listagem não traz as imagens (só o detalhe traz) — busca à parte.
    const res = await api.get<ApiOk<ProductDetail>>(`/products/${product.id}`);
    setImages(res.data.images);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    const payload = {
      name: form.name,
      brandId: form.brandId || undefined,
      categoryId: form.categoryId || undefined,
      warrantyPolicyId: form.warrantyPolicyId,
      sku: form.sku || undefined,
      sellPrice: Number(form.sellPrice),
      salePrice: form.salePrice ? Number(form.salePrice) : undefined,
      shortDescription: form.shortDescription || undefined,
      description: form.description || undefined,
      isFeatured: form.isFeatured,
      isService: form.isService,
    };

    try {
      if (editingId) {
        await update(editingId, payload);
      } else {
        // Cria o produto e mantém o modal aberto, já em modo edição, para
        // que dê pra adicionar imagens na sequência sem reabrir a tela.
        const res = await api.post<ApiOk<Product>>('/products', payload);
        setEditingId(res.data.id);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar produto.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddImage() {
    if (!editingId || !newImageUrl.trim()) return;
    setIsAddingImage(true);
    setImageError(null);
    try {
      const res = await api.post<ApiOk<ProductImage>>(`/products/${editingId}/images`, {
        url: newImageUrl.trim(),
        isPrimary: images.length === 0, // primeira imagem vira principal automaticamente
      });
      setImages((prev) => [...prev, res.data]);
      setNewImageUrl('');
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'URL de imagem inválida.');
    } finally {
      setIsAddingImage(false);
    }
  }

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setImageError(null);
  }

  async function handleUploadFile() {
    if (!editingId || !selectedFile) return;
    setIsUploadingFile(true);
    setImageError(null);
    try {
      const { base64, mimeType } = await resizeImageToBase64(selectedFile);
      const res = await api.post<ApiOk<ProductImage>>(`/products/${editingId}/images/upload`, {
        base64,
        mimeType,
        isPrimary: images.length === 0,
      });
      setImages((prev) => [...prev, res.data]);
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Erro ao enviar a imagem.');
    } finally {
      setIsUploadingFile(false);
    }
  }

  function cancelFileSelection() {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  async function handleRemoveImage(imageId: string) {
    if (!editingId) return;
    await api.delete(`/products/${editingId}/images/${imageId}`);
    setImages((prev) => prev.filter((img) => img.id !== imageId));
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink">Produtos</h1>
        <Button onClick={openCreate}>
          <Plus size={16} /> Novo produto
        </Button>
      </div>

      <Input
        placeholder="Buscar por nome..."
        className="mt-4 max-w-sm"
        onChange={(e) => setParams({ ...params, search: e.target.value })}
      />

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-white">
        {isLoading ? (
          <div className="flex justify-center py-16 text-ink/40">
            <Spinner className="h-6 w-6" />
          </div>
        ) : error ? (
          <p className="p-6 text-sm text-destructive">{error}</p>
        ) : !products || products.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Nenhum produto cadastrado ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-ink/[0.02] text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Preço</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-4 py-3 font-medium text-ink">{product.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{product.sku ?? '—'}</td>
                  <td className="px-4 py-3 font-mono">{formatBRL(product.sellPrice)}</td>
                  <td className="px-4 py-3">
                    <span className={product.isActive ? 'text-success' : 'text-muted-foreground'}>
                      {product.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(product)} className="p-1.5 text-ink/50 hover:text-ink" aria-label="Editar">
                      <Pencil size={15} />
                    </button>
                    {product.isActive && (
                      <button onClick={() => remove(product.id)} className="p-1.5 text-ink/50 hover:text-destructive" aria-label="Desativar">
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar produto' : 'Novo produto'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />

          <div className="grid grid-cols-2 gap-3">
            <select
              className="h-10 rounded-md border border-input bg-white px-3 text-sm"
              value={form.brandId}
              onChange={(e) => setForm({ ...form, brandId: e.target.value })}
            >
              <option value="">Sem marca</option>
              {(brands ?? []).map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-input bg-white px-3 text-sm"
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              <option value="">Sem categoria</option>
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Garantia</label>
            <select
              className="mt-1 h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
              value={form.warrantyPolicyId}
              onChange={(e) => setForm({ ...form, warrantyPolicyId: e.target.value })}
            >
              <option value="">Sem garantia vinculada (usa o padrão de 90 dias)</option>
              {warrantyPolicies.map((policy) => (
                <option key={policy.id} value={policy.id}>{policy.name} — {policy.days} dias</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            <Input placeholder="Preço" type="number" step="0.01" value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: e.target.value })} required />
            <Input placeholder="Preço promo (opcional)" type="number" step="0.01" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} />
          </div>

          <Input placeholder="Descrição curta" value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} />

          <textarea
            placeholder="Descrição completa"
            className="min-h-24 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} />
              Destaque
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.isService} onChange={(e) => setForm({ ...form, isService: e.target.checked })} />
              É um serviço (sem estoque)
            </label>
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <Button type="submit" className="w-full" disabled={isSaving}>
            {isSaving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar produto'}
          </Button>

          {/* Imagens só ficam disponíveis depois que o produto existe (precisa de um id). */}
          {editingId && (
            <div className="border-t border-border pt-4">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <ImageIcon size={14} /> Imagens
              </h3>

              {images.length > 0 && (
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {images.map((image) => (
                    <div key={image.id} className="group relative aspect-square overflow-hidden rounded-md border border-border">
                      <img src={image.url} alt="" className="h-full w-full object-cover" />
                      {image.isPrimary && (
                        <span className="absolute left-1 top-1 rounded bg-flash px-1 text-[10px] font-bold text-ink">Principal</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(image.id)}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label="Remover imagem"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3">
                {previewUrl ? (
                  <div className="flex items-center gap-3 rounded-md border border-border p-3">
                    <img src={previewUrl} alt="Prévia" className="h-16 w-16 rounded object-cover" />
                    <div className="flex-1 text-xs text-muted-foreground">{selectedFile?.name}</div>
                    <Button type="button" size="sm" onClick={handleUploadFile} disabled={isUploadingFile}>
                      {isUploadingFile ? 'Enviando...' : 'Enviar'}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={cancelFileSelection}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border py-3 text-sm text-ink/70 hover:border-brand hover:text-brand">
                    <Upload size={16} />
                    Escolher imagem do computador
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFileSelect} />
                  </label>
                )}
              </div>

              {!showUrlOption ? (
                <button
                  type="button"
                  onClick={() => setShowUrlOption(true)}
                  className="mt-2 text-xs font-medium text-brand hover:underline"
                >
                  ou adicionar por URL
                </button>
              ) : (
                <div className="mt-3 flex gap-2">
                  <Input
                    placeholder="URL da imagem (https://...)"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                  />
                  <Button type="button" variant="outline" onClick={handleAddImage} disabled={isAddingImage || !newImageUrl.trim()}>
                    {isAddingImage ? 'Adicionando...' : 'Adicionar'}
                  </Button>
                </div>
              )}
              {imageError && <p className="mt-1 text-sm text-destructive">{imageError}</p>}
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
