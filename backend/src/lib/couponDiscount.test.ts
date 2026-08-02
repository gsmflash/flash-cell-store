import { describe, it, expect } from 'vitest';
import { computeCouponDiscount } from './couponDiscount';

describe('computeCouponDiscount', () => {
  it('cupom percentual simples', () => {
    expect(computeCouponDiscount({ type: 'percentage', value: 10, maxDiscount: null }, 200)).toBe(20);
  });

  it('cupom de valor fixo', () => {
    expect(computeCouponDiscount({ type: 'fixed', value: 15, maxDiscount: null }, 200)).toBe(15);
  });

  it('cupom percentual respeita o teto de desconto máximo', () => {
    expect(computeCouponDiscount({ type: 'percentage', value: 50, maxDiscount: 30 }, 200)).toBe(30);
  });

  it('nunca desconta mais que o próprio subtotal (cupom fixo maior que a compra)', () => {
    expect(computeCouponDiscount({ type: 'fixed', value: 500, maxDiscount: null }, 100)).toBe(100);
  });

  it('cupom percentual de 100% desconta o subtotal inteiro', () => {
    expect(computeCouponDiscount({ type: 'percentage', value: 100, maxDiscount: null }, 80)).toBe(80);
  });
});
