import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QrCode, CreditCard, Copy, Check } from 'lucide-react';
import { Container } from '@/components/ui/container';
import { api, ApiClientError } from '@/lib/api';
import type { ApiOk } from '@/types/api';

interface PixCheckoutResult {
  paymentId: string;
  qrCode: string | null;
  qrCodeBase64: string | null;
  expiresAt: string | null;
}

export function OrderPayment() {
  const { id } = useParams<{ id: string }>();
  const [method, setMethod] = useState<'pix' | 'card' | null>(null);
  const [pix, setPix] = useState<PixCheckoutResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handlePix() {
    if (!id) return;
    setMethod('pix');
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.post<ApiOk<PixCheckoutResult>>(`/payments/orders/${id}/pix`);
      setPix(res.data);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Não foi possível gerar o PIX.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCard() {
    if (!id) return;
    setMethod('card');
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.post<ApiOk<{ checkoutUrl: string }>>(`/payments/orders/${id}/card`);
      window.location.href = res.data.checkoutUrl;
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Não foi possível iniciar o pagamento com cartão.');
      setIsLoading(false);
    }
  }

  function copyPixCode() {
    if (!pix?.qrCode) return;
    navigator.clipboard.writeText(pix.qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Container className="flex min-h-[60vh] flex-col items-center py-16">
      <h1 className="font-display text-2xl font-bold text-ink">Pagamento</h1>
      <p className="mt-1 text-sm text-muted-foreground">Escolha como prefere pagar.</p>

      {!method && (
        <div className="mt-8 grid w-full max-w-md gap-3 sm:grid-cols-2">
          <button
            onClick={handlePix}
            className="flex flex-col items-center gap-2 rounded-lg border border-border bg-white p-6 hover:border-brand"
          >
            <QrCode size={28} className="text-brand" />
            <span className="text-sm font-semibold text-ink">PIX</span>
            <span className="text-xs text-muted-foreground">Aprovação na hora</span>
          </button>
          <button
            onClick={handleCard}
            className="flex flex-col items-center gap-2 rounded-lg border border-border bg-white p-6 hover:border-brand"
          >
            <CreditCard size={28} className="text-brand" />
            <span className="text-sm font-semibold text-ink">Cartão / Boleto</span>
            <span className="text-xs text-muted-foreground">Via Mercado Pago</span>
          </button>
        </div>
      )}

      {method === 'pix' && (
        <div className="mt-8 flex w-full max-w-sm flex-col items-center text-center">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Gerando QR code...</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : pix ? (
            <>
              {pix.qrCodeBase64 && (
                <img
                  src={`data:image/png;base64,${pix.qrCodeBase64}`}
                  alt="QR Code PIX"
                  className="h-56 w-56 rounded-lg border border-border"
                />
              )}
              <p className="mt-4 text-sm text-muted-foreground">
                Escaneie o QR code no app do seu banco, ou copie o código abaixo.
              </p>
              {pix.qrCode && (
                <button
                  onClick={copyPixCode}
                  className="mt-3 flex items-center gap-2 rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5"
                >
                  {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                  {copied ? 'Copiado!' : 'Copiar código PIX'}
                </button>
              )}
              <p className="mt-4 text-xs text-muted-foreground">
                Assim que o pagamento for confirmado, o status do seu pedido é atualizado automaticamente.
              </p>
            </>
          ) : null}
        </div>
      )}

      {method === 'card' && isLoading && (
        <p className="mt-8 text-sm text-muted-foreground">Redirecionando para o Mercado Pago...</p>
      )}
      {method === 'card' && error && <p className="mt-8 text-sm text-destructive">{error}</p>}

      <Link to={`/pedidos/${id}`} className="mt-8 text-sm text-muted-foreground hover:text-ink">
        Ver detalhes do pedido
      </Link>
    </Container>
  );
}
