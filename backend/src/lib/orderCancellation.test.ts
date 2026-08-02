import { describe, it, expect } from 'vitest';
import { canCancelOrder } from './orderCancellation';

describe('canCancelOrder', () => {
  it('permite cancelar antes do envio', () => {
    expect(canCancelOrder('pending')).toBe(true);
    expect(canCancelOrder('confirmed')).toBe(true);
    expect(canCancelOrder('processing')).toBe(true);
  });

  it('não permite cancelar depois de enviado ou finalizado', () => {
    expect(canCancelOrder('shipped')).toBe(false);
    expect(canCancelOrder('delivered')).toBe(false);
    expect(canCancelOrder('cancelled')).toBe(false);
    expect(canCancelOrder('refunded')).toBe(false);
  });
});
