import { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  /** Duração da janela em milissegundos. */
  windowMs: number;
  /** Número máximo de requisições permitidas por chave dentro da janela. */
  max: number;
  /** Mensagem retornada ao estourar o limite. */
  message?: string;
  /** Como identificar o "cliente". Padrão: IP da requisição. */
  keyGenerator?: (req: Request) => string;
}

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Rate limiter simples, em memória, por janela fixa.
 *
 * Implementação deliberadamente sem dependências externas (ex.: sem
 * `express-rate-limit`) para não introduzir pacotes desnecessários nesta
 * etapa. É suficiente para uma única instância do servidor.
 *
 * Limitação conhecida: como o estado vive em memória do processo, ele não é
 * compartilhado entre múltiplas instâncias do backend (ex.: atrás de um
 * load balancer) e é perdido a cada restart. Se o backend crescer para
 * múltiplas réplicas, migrar para um store compartilhado (Redis) — já listado
 * no TODO.md do projeto como melhoria futura relacionada (blacklist de tokens).
 */
export function rateLimiter(options: RateLimitOptions) {
  const buckets = new Map<string, Bucket>();
  const keyGenerator = options.keyGenerator ?? ((req: Request) => req.ip ?? 'unknown');

  // Limpeza periódica para não acumular entradas expiradas indefinidamente.
  const cleanupInterval = setInterval(
    () => {
      const now = Date.now();
      for (const [key, bucket] of buckets) {
        if (now > bucket.resetAt) buckets.delete(key);
      }
    },
    Math.max(options.windowMs, 60_000),
  );
  cleanupInterval.unref?.();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    if (bucket.count >= options.max) {
      const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({
        status: 'error',
        message: options.message ?? 'Muitas requisições. Tente novamente mais tarde.',
      });
      return;
    }

    bucket.count += 1;
    next();
  };
}
