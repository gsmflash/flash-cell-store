import { describe, it, expect } from 'vitest';
import {
  isUniqueViolation,
  isForeignKeyViolation,
  isNotNullViolation,
  describeConstraintError,
} from './dbErrors';

function pgError(code: string) {
  return { code, message: 'detalhe interno que não deve vazar para o cliente' };
}

describe('dbErrors', () => {
  it('reconhece violação de unique constraint (23505)', () => {
    expect(isUniqueViolation(pgError('23505'))).toBe(true);
    expect(isUniqueViolation(pgError('23503'))).toBe(false);
  });

  it('reconhece violação de foreign key (23503)', () => {
    expect(isForeignKeyViolation(pgError('23503'))).toBe(true);
  });

  it('reconhece violação de not-null (23502)', () => {
    expect(isNotNullViolation(pgError('23502'))).toBe(true);
  });

  it('describeConstraintError retorna 409 e mensagem segura para unique violation', () => {
    const result = describeConstraintError(pgError('23505'));
    expect(result).not.toBeNull();
    expect(result?.statusCode).toBe(409);
    expect(result?.message).not.toContain('detalhe interno');
  });

  it('describeConstraintError retorna null para erros desconhecidos (tratar como 500 genérico)', () => {
    expect(describeConstraintError(new Error('erro qualquer'))).toBeNull();
    expect(describeConstraintError(pgError('99999'))).toBeNull();
  });
});
