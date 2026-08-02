import { describe, it, expect } from 'vitest';
import { computeDelta } from './stock.service';

describe('computeDelta', () => {
  it('entrada (in) soma a quantidade ao saldo', () => {
    expect(computeDelta('in', 10)).toBe(10);
  });

  it('devolução (return) soma a quantidade ao saldo', () => {
    expect(computeDelta('return', 5)).toBe(5);
  });

  it('saída (out) subtrai a quantidade do saldo', () => {
    expect(computeDelta('out', 3)).toBe(-3);
  });

  it('perda (loss) subtrai a quantidade do saldo', () => {
    expect(computeDelta('loss', 2)).toBe(-2);
  });

  it('ajuste (adjustment) aplica a quantidade diretamente como delta', () => {
    expect(computeDelta('adjustment', 7)).toBe(7);
    expect(computeDelta('adjustment', -4)).toBe(-4);
  });
});
