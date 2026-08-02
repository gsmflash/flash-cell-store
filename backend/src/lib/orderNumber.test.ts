import { describe, it, expect } from 'vitest';
import { formatOrderNumber, extractOrderSequenceForYear, nextOrderNumber } from './orderNumber';

describe('formatOrderNumber', () => {
  it('formata com zero à esquerda até 4 dígitos', () => {
    expect(formatOrderNumber(2026, 1)).toBe('PED-2026-0001');
  });
});

describe('extractOrderSequenceForYear', () => {
  it('extrai a sequência quando o ano bate', () => {
    expect(extractOrderSequenceForYear('PED-2026-0007', 2026)).toBe(7);
  });

  it('retorna null quando o ano é diferente', () => {
    expect(extractOrderSequenceForYear('PED-2025-0007', 2026)).toBeNull();
  });
});

describe('nextOrderNumber', () => {
  it('começa em 0001 quando não há pedido anterior no ano', () => {
    expect(nextOrderNumber(2026, null)).toBe('PED-2026-0001');
  });

  it('incrementa a partir do último pedido do mesmo ano', () => {
    expect(nextOrderNumber(2026, 'PED-2026-0009')).toBe('PED-2026-0010');
  });

  it('reinicia em 0001 na virada de ano', () => {
    expect(nextOrderNumber(2026, 'PED-2025-0999')).toBe('PED-2026-0001');
  });
});
