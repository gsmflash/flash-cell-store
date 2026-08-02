import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Réplica do schema usado em routes/stock.ts — testado isoladamente pelo
// mesmo motivo do products.validation.test.ts (schema não exportado da rota).
const movementTypeSchema = z.enum(['in', 'out', 'adjustment', 'return', 'loss']);

const registerMovementSchema = z.object({
  productId: z.string().uuid('productId inválido.'),
  type: movementTypeSchema,
  quantity: z.number().int().positive('Quantidade deve ser um número inteiro positivo.'),
  supplierId: z.string().uuid('supplierId inválido.').optional(),
  unitCost: z.number().nonnegative().optional(),
});

const validProductId = '11111111-1111-1111-1111-111111111111';

describe('validação de movimentação de estoque', () => {
  it('aceita uma entrada válida mínima', () => {
    const result = registerMovementSchema.safeParse({ productId: validProductId, type: 'in', quantity: 10 });
    expect(result.success).toBe(true);
  });

  it('rejeita quantity zero ou negativa', () => {
    expect(registerMovementSchema.safeParse({ productId: validProductId, type: 'in', quantity: 0 }).success).toBe(false);
    expect(registerMovementSchema.safeParse({ productId: validProductId, type: 'in', quantity: -5 }).success).toBe(false);
  });

  it('rejeita quantity não inteira', () => {
    const result = registerMovementSchema.safeParse({ productId: validProductId, type: 'in', quantity: 1.5 });
    expect(result.success).toBe(false);
  });

  it('rejeita um type fora do enum permitido', () => {
    const result = registerMovementSchema.safeParse({ productId: validProductId, type: 'venda', quantity: 1 });
    expect(result.success).toBe(false);
  });

  it('rejeita productId que não é UUID', () => {
    const result = registerMovementSchema.safeParse({ productId: 'abc', type: 'in', quantity: 1 });
    expect(result.success).toBe(false);
  });

  it('rejeita unitCost negativo', () => {
    const result = registerMovementSchema.safeParse({
      productId: validProductId,
      type: 'in',
      quantity: 1,
      unitCost: -1,
    });
    expect(result.success).toBe(false);
  });
});
