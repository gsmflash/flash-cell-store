import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Réplica mínima do schema usado em routes/products.ts — testado aqui de forma
// isolada porque o schema não é exportado do arquivo de rotas (só usado
// internamente). Mantém as mesmas regras de negócio.
const productInputSchema = z.object({
  name: z.string().trim().min(2).max(255),
  sellPrice: z.number().positive('Preço de venda deve ser positivo.'),
  costPrice: z.number().nonnegative().optional(),
  brandId: z.string().uuid('brandId inválido.').optional(),
});

describe('validação de entrada de produto', () => {
  it('aceita um produto válido mínimo', () => {
    const result = productInputSchema.safeParse({ name: 'Capa iPhone 15', sellPrice: 49.9 });
    expect(result.success).toBe(true);
  });

  it('rejeita sellPrice zero ou negativo', () => {
    expect(productInputSchema.safeParse({ name: 'Produto', sellPrice: 0 }).success).toBe(false);
    expect(productInputSchema.safeParse({ name: 'Produto', sellPrice: -10 }).success).toBe(false);
  });

  it('rejeita nome muito curto', () => {
    expect(productInputSchema.safeParse({ name: 'X', sellPrice: 10 }).success).toBe(false);
  });

  it('rejeita brandId que não é um UUID', () => {
    const result = productInputSchema.safeParse({ name: 'Produto', sellPrice: 10, brandId: 'não-é-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejeita costPrice negativo', () => {
    const result = productInputSchema.safeParse({ name: 'Produto', sellPrice: 10, costPrice: -1 });
    expect(result.success).toBe(false);
  });
});
