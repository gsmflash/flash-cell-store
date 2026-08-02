import { structuredLogger } from './structuredLogger';

/**
 * Ponto único por onde TODO erro não-operacional (bug de verdade, não uma
 * validação esperada) passa. Hoje só loga estruturado; quando você tiver uma
 * conta do Sentry, é aqui que entra a chamada `Sentry.captureException(err)`.
 *
 * Não integrei o SDK do Sentry (`@sentry/node`) agora de propósito: é uma
 * dependência nova que eu não teria como testar a instalação neste ambiente
 * sem rede, e um SDK de terceiros mal-testado é pior que não ter nada.
 * Passos para ativar de verdade:
 *   1. `pnpm --filter @flash-cell/backend add @sentry/node`
 *   2. `Sentry.init({ dsn: process.env.SENTRY_DSN })` no topo de `index.ts`
 *   3. Descomentar a chamada abaixo
 */
export function reportError(err: Error, context?: Record<string, unknown>): void {
  structuredLogger.error(err.message, {
    stack: err.stack,
    name: err.name,
    ...context,
  });

  // if (process.env.SENTRY_DSN) {
  //   Sentry.captureException(err, { extra: context });
  // }
}
