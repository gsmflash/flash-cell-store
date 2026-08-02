export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

/**
 * Um pedido só pode ser cancelado antes de ser enviado — depois disso, a
 * mercadoria já saiu fisicamente e o caminho correto é devolução/reembolso,
 * não cancelamento simples com reversão de estoque.
 */
const CANCELLABLE_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'processing'];

export function canCancelOrder(status: OrderStatus): boolean {
  return CANCELLABLE_STATUSES.includes(status);
}
