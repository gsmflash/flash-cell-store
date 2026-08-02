/**
 * Reconhecimento de erros do driver `pg` pelo código SQLSTATE.
 * Referência: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */

interface PostgresError {
  code?: string;
  constraint?: string;
  detail?: string;
}

const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';
const NOT_NULL_VIOLATION = '23502';

function toPostgresError(err: unknown): PostgresError | null {
  if (err && typeof err === 'object' && 'code' in err) {
    return err as PostgresError;
  }
  return null;
}

export function isUniqueViolation(err: unknown): boolean {
  return toPostgresError(err)?.code === UNIQUE_VIOLATION;
}

export function isForeignKeyViolation(err: unknown): boolean {
  return toPostgresError(err)?.code === FOREIGN_KEY_VIOLATION;
}

export function isNotNullViolation(err: unknown): boolean {
  return toPostgresError(err)?.code === NOT_NULL_VIOLATION;
}

/**
 * Converte um erro de constraint do Postgres em uma mensagem segura e
 * legível para o cliente, sem expor nomes de tabelas/colunas/constraints
 * internas. Retorna null se o erro não for um erro de constraint conhecido
 * (nesse caso, o chamador deve tratar como erro interno genérico).
 */
export function describeConstraintError(err: unknown): { statusCode: number; message: string } | null {
  if (isUniqueViolation(err)) {
    return { statusCode: 409, message: 'Já existe um registro com esses dados.' };
  }

  if (isForeignKeyViolation(err)) {
    return { statusCode: 409, message: 'Operação inválida: referência a um registro inexistente.' };
  }

  if (isNotNullViolation(err)) {
    return { statusCode: 400, message: 'Campos obrigatórios ausentes.' };
  }

  return null;
}
