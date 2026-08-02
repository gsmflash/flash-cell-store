export interface CouponForDiscount {
  type: 'percentage' | 'fixed';
  value: number;
  maxDiscount: number | null;
}

/**
 * Calcula o valor do desconto para um cupom já validado (ativo, dentro da
 * janela de validade, uso disponível) contra um subtotal. Nunca retorna mais
 * que o próprio subtotal (desconto não deixa o pedido negativo).
 */
export function computeCouponDiscount(coupon: CouponForDiscount, subtotal: number): number {
  const rawDiscount = coupon.type === 'percentage' ? subtotal * (coupon.value / 100) : coupon.value;

  const cappedByMax = coupon.maxDiscount !== null ? Math.min(rawDiscount, coupon.maxDiscount) : rawDiscount;

  return Math.min(cappedByMax, subtotal);
}
