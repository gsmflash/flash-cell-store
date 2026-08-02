/**
 * Rastreador de tentativas de login falhas, em memória, por identificador
 * (normalmente o e-mail normalizado).
 *
 * Complementa o rate limiting por IP (middleware/rateLimiter.ts): o rate
 * limiter por IP protege contra um único atacante testando muitas contas;
 * este módulo protege uma conta específica contra tentativas vindas de
 * IPs diferentes (ex.: botnets).
 *
 * Mesma limitação do rate limiter: estado em memória do processo, não
 * compartilhado entre instâncias. Para múltiplas réplicas do backend,
 * mover para Redis ou tabela no banco (ver TODO.md).
 */

const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const MAX_ATTEMPTS = 5;

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
}

const attempts = new Map<string, AttemptRecord>();

function isExpired(record: AttemptRecord): boolean {
  return Date.now() - record.firstAttemptAt > WINDOW_MS;
}

/**
 * Retorna true se o identificador excedeu o número de tentativas falhas
 * permitidas dentro da janela atual.
 */
export function isLoginBlocked(identifier: string): boolean {
  const record = attempts.get(identifier);
  if (!record) return false;

  if (isExpired(record)) {
    attempts.delete(identifier);
    return false;
  }

  return record.count >= MAX_ATTEMPTS;
}

/**
 * Registra uma tentativa de login falha para o identificador.
 */
export function registerFailedLoginAttempt(identifier: string): void {
  const record = attempts.get(identifier);

  if (!record || isExpired(record)) {
    attempts.set(identifier, { count: 1, firstAttemptAt: Date.now() });
    return;
  }

  record.count += 1;
}

/**
 * Limpa o histórico de tentativas falhas (chamar após login bem-sucedido).
 */
export function resetLoginAttempts(identifier: string): void {
  attempts.delete(identifier);
}
