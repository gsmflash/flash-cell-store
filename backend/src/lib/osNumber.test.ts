import { describe, it, expect } from 'vitest';
import { formatOsNumber, extractSequenceForYear, nextOsNumber } from './osNumber';

describe('formatOsNumber', () => {
  it('formata com zero à esquerda até 4 dígitos', () => {
    expect(formatOsNumber(2026, 1)).toBe('OS-2026-0001');
    expect(formatOsNumber(2026, 42)).toBe('OS-2026-0042');
  });

  it('não trunca sequências com mais de 4 dígitos', () => {
    expect(formatOsNumber(2026, 12345)).toBe('OS-2026-12345');
  });
});

describe('extractSequenceForYear', () => {
  it('extrai a sequência quando o ano bate', () => {
    expect(extractSequenceForYear('OS-2026-0007', 2026)).toBe(7);
  });

  it('retorna null quando o ano é diferente', () => {
    expect(extractSequenceForYear('OS-2025-0007', 2026)).toBeNull();
  });

  it('retorna null para um número fora do padrão', () => {
    expect(extractSequenceForYear('qualquer-coisa', 2026)).toBeNull();
  });
});

describe('nextOsNumber', () => {
  it('começa em 0001 quando não há OS anterior no ano', () => {
    expect(nextOsNumber(2026, null)).toBe('OS-2026-0001');
  });

  it('incrementa a partir da última OS do mesmo ano', () => {
    expect(nextOsNumber(2026, 'OS-2026-0009')).toBe('OS-2026-0010');
  });

  it('reinicia em 0001 se a última OS for de um ano anterior (virada de ano)', () => {
    expect(nextOsNumber(2026, 'OS-2025-0999')).toBe('OS-2026-0001');
  });
});
