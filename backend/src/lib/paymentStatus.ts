export type InternalPaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';

/**
 * Mapeia os status retornados pela API do Mercado Pago para o nosso enum
 * interno. Referência: https://www.mercadopago.com.br/developers/pt/docs/checkout-api/response-handling/collection-results
 */
const STATUS_MAP: Record<string, InternalPaymentStatus> = {
  pending: 'pending',
  in_process: 'pending',
  authorized: 'pending',
  approved: 'paid',
  rejected: 'failed',
  refunded: 'refunded',
  cancelled: 'cancelled',
  charged_back: 'refunded',
};

/** Status desconhecidos do Mercado Pago caem em 'pending' por segurança (nunca assume pago sem confirmação explícita). */
export function mapMercadoPagoStatus(mpStatus: string): InternalPaymentStatus {
  return STATUS_MAP[mpStatus] ?? 'pending';
}
