import { describe, it, expect } from 'vitest';
import { computeWarrantyEndDate, isWarrantyValid } from './warrantyRules';

describe('computeWarrantyEndDate', () => {
  it('soma 90 dias para garantia de serviço', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const end = computeWarrantyEndDate(start, 'service');
    expect(end.toISOString().slice(0, 10)).toBe('2026-04-01');
  });

  it('soma 90 dias para garantia de loja', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const end = computeWarrantyEndDate(start, 'store');
    expect(end.toISOString().slice(0, 10)).toBe('2026-04-01');
  });

  it('soma 365 dias para garantia de fabricante', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const end = computeWarrantyEndDate(start, 'manufacturer');
    expect(end.toISOString().slice(0, 10)).toBe('2027-01-01');
  });
});

describe('isWarrantyValid', () => {
  it('é válida quando ativa e dentro do prazo', () => {
    const now = new Date('2026-02-01');
    const end = new Date('2026-04-01');
    expect(isWarrantyValid(true, end, now)).toBe(true);
  });

  it('não é válida quando o prazo já passou', () => {
    const now = new Date('2026-05-01');
    const end = new Date('2026-04-01');
    expect(isWarrantyValid(true, end, now)).toBe(false);
  });

  it('não é válida quando foi anulada (isActive=false), mesmo dentro do prazo', () => {
    const now = new Date('2026-02-01');
    const end = new Date('2026-04-01');
    expect(isWarrantyValid(false, end, now)).toBe(false);
  });

  it('é válida exatamente no último dia', () => {
    const end = new Date('2026-04-01');
    expect(isWarrantyValid(true, end, end)).toBe(true);
  });
});
