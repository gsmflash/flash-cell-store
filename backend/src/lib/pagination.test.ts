import { describe, it, expect } from 'vitest';
import { paginationQuerySchema, buildPaginationMeta, toOffset } from './pagination';

describe('paginationQuerySchema', () => {
  it('aplica valores padrão quando nada é informado', () => {
    const result = paginationQuerySchema.parse({});
    expect(result).toEqual({ page: 1, perPage: 20 });
  });

  it('faz coerce de strings vindas de query params para número', () => {
    const result = paginationQuerySchema.parse({ page: '3', perPage: '50' });
    expect(result).toEqual({ page: 3, perPage: 50 });
  });

  it('rejeita perPage acima do máximo permitido (200)', () => {
    expect(() => paginationQuerySchema.parse({ perPage: 500 })).toThrow();
  });

  it('rejeita page menor que 1', () => {
    expect(() => paginationQuerySchema.parse({ page: 0 })).toThrow();
  });
});

describe('buildPaginationMeta', () => {
  it('calcula totalPages corretamente com divisão exata', () => {
    expect(buildPaginationMeta(100, 1, 20)).toEqual({ total: 100, page: 1, perPage: 20, totalPages: 5 });
  });

  it('arredonda totalPages para cima com divisão não exata', () => {
    expect(buildPaginationMeta(101, 1, 20)).toEqual({ total: 101, page: 1, perPage: 20, totalPages: 6 });
  });

  it('retorna ao menos 1 página mesmo com total zero', () => {
    expect(buildPaginationMeta(0, 1, 20).totalPages).toBe(1);
  });
});

describe('toOffset', () => {
  it('calcula o offset a partir de page/perPage (1-indexado)', () => {
    expect(toOffset(1, 20)).toBe(0);
    expect(toOffset(2, 20)).toBe(20);
    expect(toOffset(3, 10)).toBe(20);
  });
});
