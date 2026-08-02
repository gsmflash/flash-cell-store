/**
 * Logger estruturado simples: escreve uma linha JSON por evento no
 * stdout/stderr. Não usa nenhuma biblioteca externa (ex.: pino) de
 * propósito — evita adicionar uma dependência que eu não teria como
 * verificar a instalação neste ambiente sem rede.
 *
 * A maioria dos provedores de hospedagem (Railway, Render, etc.) já
 * coleta stdout/stderr automaticamente; logs em JSON ficam fáceis de
 * filtrar e buscar no painel deles, ou de encaminhar para uma ferramenta
 * de observabilidade depois (Datadog, Better Stack, etc.).
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface StructuredLogFields {
  [key: string]: unknown;
}

function write(level: LogLevel, message: string, fields?: StructuredLogFields): void {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...fields,
  });

  if (level === 'error' || level === 'warn') {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const structuredLogger = {
  debug: (message: string, fields?: StructuredLogFields) => write('debug', message, fields),
  info: (message: string, fields?: StructuredLogFields) => write('info', message, fields),
  warn: (message: string, fields?: StructuredLogFields) => write('warn', message, fields),
  error: (message: string, fields?: StructuredLogFields) => write('error', message, fields),
};
