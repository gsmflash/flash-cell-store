export type DiscountType = 'fixed' | 'percentage';
export type ReceivableStatus = 'pending' | 'partial' | 'paid';

/** Calcula o valor final aplicando o desconto (fixo em R$, ou percentual sobre o subtotal). */
export function computeFinalValue(subtotal: number, discount: number, discountType: DiscountType): number {
  const discountAmount = discountType === 'percentage' ? subtotal * (discount / 100) : discount;
  const final = subtotal - discountAmount;
  return Math.max(0, Math.round(final * 100) / 100);
}

/**
 * Situação calculada a partir do que já foi recebido:
 * - 'paid' quando recebido >= valor final (usa >= por segurança, cobre
 *   pequenas diferenças de arredondamento em centavos)
 * - 'partial' quando recebeu algo, mas não o suficiente
 * - 'pending' quando não recebeu nada ainda
 */
export function computeReceivableStatus(finalValue: number, receivedAmount: number): ReceivableStatus {
  if (receivedAmount <= 0) return 'pending';
  if (receivedAmount >= finalValue) return 'paid';
  return 'partial';
}

/** Troco: quanto o valor pago excedeu o saldo devedor no momento do pagamento. Nunca negativo. */
export function computeChangeAmount(amountPaid: number, amountOwed: number): number {
  return Math.max(0, Math.round((amountPaid - amountOwed) * 100) / 100);
}

/** Saldo restante após um pagamento. Nunca negativo (excesso vira troco, não saldo negativo). */
export function computeRemainingAmount(finalValue: number, receivedAmount: number): number {
  return Math.max(0, Math.round((finalValue - receivedAmount) * 100) / 100);
}
