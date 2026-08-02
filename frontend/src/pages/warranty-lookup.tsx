import { useState, type FormEvent } from 'react';
import { ShieldCheck, Search } from 'lucide-react';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api, ApiClientError } from '@/lib/api';
import type { ApiOk, Warranty } from '@/types/api';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

const TYPE_LABEL: Record<Warranty['type'], string> = {
  manufacturer: 'Garantia de fabricante',
  store: 'Garantia de loja',
  service: 'Garantia de serviço',
};

export function WarrantyLookup() {
  const [imei, setImei] = useState('');
  const [document, setDocument] = useState('');
  const [results, setResults] = useState<Warranty[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await api.get<ApiOk<Warranty[]>>('/warranties/lookup', {
        params: { ...(imei && { imei }), ...(document && { document }) },
      });
      setResults(res.data);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Erro ao consultar garantia.');
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-lg text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand">
          <ShieldCheck size={24} />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold text-ink">Consultar garantia</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Informe o IMEI/número de série do aparelho, ou o CPF/CNPJ usado na compra.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3 text-left">
          <Input placeholder="IMEI ou número de série" value={imei} onChange={(e) => setImei(e.target.value)} />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
          </div>
          <Input placeholder="CPF ou CNPJ" value={document} onChange={(e) => setDocument(e.target.value)} />
          <Button type="submit" className="w-full" disabled={isLoading || (!imei && !document)}>
            <Search size={16} /> {isLoading ? 'Consultando...' : 'Consultar'}
          </Button>
        </form>
      </div>

      {searched && (
        <div className="mx-auto mt-10 max-w-2xl">
          {error ? (
            <p className="text-center text-sm text-destructive">{error}</p>
          ) : !results || results.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">Nenhuma garantia encontrada para esses dados.</p>
          ) : (
            <ul className="space-y-3">
              {results.map((warranty) => (
                <li key={warranty.id} className="rounded-lg border border-border bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink">{TYPE_LABEL[warranty.type]}</span>
                    <Badge variant={warranty.isValid ? 'success' : 'danger'}>{warranty.isValid ? 'Válida' : 'Expirada/anulada'}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-ink/70">{warranty.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDate(warranty.startDate)} até {formatDate(warranty.endDate)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Container>
  );
}
