import { env } from '../config/env';

/**
 * Wrapper fino sobre a API REST do Mercado Pago (sem o SDK oficial — só
 * `fetch`, para não depender de um pacote que eu não consigo testar a
 * instalação aqui). Baseado na documentação pública da API:
 * https://www.mercadopago.com.br/developers/pt/reference
 *
 * ⚠️ IMPORTANTE: este código nunca foi executado contra a API real do
 * Mercado Pago neste ambiente (sem acesso à internet). A estrutura das
 * requisições/respostas segue a documentação oficial, mas você precisa
 * validar com uma credencial de teste (sandbox) antes de usar em produção.
 * https://www.mercadopago.com.br/developers/pt/docs/checkout-api/testing
 */

const MP_API_BASE = 'https://api.mercadopago.com';

class MercadoPagoError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = 'MercadoPagoError';
  }
}

function requireAccessToken(): string {
  if (!env.MERCADOPAGO_ACCESS_TOKEN) {
    throw new Error(
      'MERCADOPAGO_ACCESS_TOKEN não configurado. Defina essa variável de ambiente com sua credencial (de teste ou produção) do Mercado Pago para usar pagamentos.',
    );
  }
  return env.MERCADOPAGO_ACCESS_TOKEN;
}

async function mpFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = requireAccessToken();

  const response = await fetch(`${MP_API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      // Idempotência: evita criar cobrança duplicada em caso de retry de rede.
      ...(options.method === 'POST' ? { 'X-Idempotency-Key': crypto.randomUUID() } : {}),
      ...options.headers,
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new MercadoPagoError(
      `Mercado Pago retornou ${response.status} em ${path}`,
      response.status,
      body,
    );
  }

  return body as T;
}

// ─── PIX (pagamento direto, sem redirecionamento) ────────────────────────────────

export interface CreatePixPaymentInput {
  amount: number;
  description: string;
  /** Nosso identificador (ex.: número do pedido) — usado para cruzar com o webhook. */
  externalReference: string;
  payerEmail: string;
}

export interface PixPaymentResult {
  id: string; // id do pagamento no Mercado Pago
  status: string; // 'pending' | 'approved' | 'rejected' | ...
  qrCode: string | null; // código "copia e cola"
  qrCodeBase64: string | null; // imagem do QR code em base64
  expiresAt: string | null;
}

export async function createPixPayment(input: CreatePixPaymentInput): Promise<PixPaymentResult> {
  const result = await mpFetch<{
    id: number;
    status: string;
    date_of_expiration?: string;
    point_of_interaction?: {
      transaction_data?: { qr_code?: string; qr_code_base64?: string };
    };
  }>('/v1/payments', {
    method: 'POST',
    body: JSON.stringify({
      transaction_amount: input.amount,
      description: input.description,
      payment_method_id: 'pix',
      external_reference: input.externalReference,
      payer: { email: input.payerEmail },
    }),
  });

  return {
    id: String(result.id),
    status: result.status,
    qrCode: result.point_of_interaction?.transaction_data?.qr_code ?? null,
    qrCodeBase64: result.point_of_interaction?.transaction_data?.qr_code_base64 ?? null,
    expiresAt: result.date_of_expiration ?? null,
  };
}

// ─── Checkout Pro (cartão/boleto — redireciona para página hospedada do Mercado Pago) ──
// Preferido para cartão porque nunca tocamos em dado de cartão no nosso backend
// (evita todo o escopo de compliance PCI-DSS).

export interface CreatePreferenceInput {
  orderNumber: string;
  items: Array<{ title: string; quantity: number; unitPrice: number }>;
  payerEmail: string;
}

export interface PreferenceResult {
  id: string;
  initPoint: string; // URL para redirecionar o cliente
}

export async function createPaymentPreference(input: CreatePreferenceInput): Promise<PreferenceResult> {
  const result = await mpFetch<{ id: string; init_point: string }>('/checkout/preferences', {
    method: 'POST',
    body: JSON.stringify({
      items: input.items.map((item) => ({
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        currency_id: 'BRL',
      })),
      payer: { email: input.payerEmail },
      external_reference: input.orderNumber,
      back_urls: {
        success: `${env.FRONTEND_URL}/pedidos/sucesso`,
        failure: `${env.FRONTEND_URL}/pedidos/erro`,
        pending: `${env.FRONTEND_URL}/pedidos/pendente`,
      },
      notification_url: `${env.FRONTEND_URL.replace(/\/$/, '')}/api/payments/webhook`,
    }),
  });

  return { id: result.id, initPoint: result.init_point };
}

// ─── Consulta e reembolso ────────────────────────────────────────────────────────

export interface MercadoPagoPayment {
  id: string;
  status: string; // 'pending' | 'approved' | 'rejected' | 'refunded' | ...
  externalReference: string | null;
  transactionAmount: number;
}

export async function getPayment(paymentId: string): Promise<MercadoPagoPayment> {
  const result = await mpFetch<{ id: number; status: string; external_reference?: string; transaction_amount: number }>(
    `/v1/payments/${paymentId}`,
  );

  return {
    id: String(result.id),
    status: result.status,
    externalReference: result.external_reference ?? null,
    transactionAmount: result.transaction_amount,
  };
}

export async function refundPayment(paymentId: string): Promise<void> {
  await mpFetch(`/v1/payments/${paymentId}/refunds`, { method: 'POST' });
}

export { MercadoPagoError };
