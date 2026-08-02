import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import type { ApiOk, StoreSettings } from '@/types/api';

export function AdminSettings() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ApiOk<StoreSettings>>('/store-settings')
      .then((res) => setSettings(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar configurações.'))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await api.put<ApiOk<StoreSettings>>('/store-settings', {
        storeName: settings.storeName,
        storeEmail: settings.storeEmail || undefined,
        storePhone: settings.storePhone || undefined,
        storeWhatsapp: settings.storeWhatsapp || undefined,
        maintenanceMode: settings.maintenanceMode,
        allowGuestCheckout: settings.allowGuestCheckout,
      });
      setSettings(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar configurações.');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <div className="flex justify-center py-24 text-ink/40"><Spinner className="h-8 w-8" /></div>;
  }

  if (!settings) return null;

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-2xl font-bold text-ink">Configurações da loja</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-ink">Nome da loja</label>
          <Input className="mt-1.5" value={settings.storeName} onChange={(e) => setSettings({ ...settings, storeName: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium text-ink">E-mail</label>
          <Input className="mt-1.5" type="email" value={settings.storeEmail ?? ''} onChange={(e) => setSettings({ ...settings, storeEmail: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-ink">Telefone</label>
            <Input className="mt-1.5" value={settings.storePhone ?? ''} onChange={(e) => setSettings({ ...settings, storePhone: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">WhatsApp</label>
            <Input className="mt-1.5" value={settings.storeWhatsapp ?? ''} onChange={(e) => setSettings({ ...settings, storeWhatsapp: e.target.value })} />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.allowGuestCheckout}
            onChange={(e) => setSettings({ ...settings, allowGuestCheckout: e.target.checked })}
          />
          Permitir checkout sem conta (guest checkout)
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.maintenanceMode}
            onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
          />
          Modo manutenção
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Salvando...' : saved ? 'Salvo ✓' : 'Salvar configurações'}
        </Button>
      </form>
    </div>
  );
}
