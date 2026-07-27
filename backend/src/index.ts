import app from './app';
import { env } from './config/env';

const server = app.listen(env.PORT, () => {
  console.log(`\n🚀  Servidor rodando em http://localhost:${env.PORT}`);
  console.log(`📦  Ambiente: ${env.NODE_ENV}`);
  console.log(`🏥  Health check: http://localhost:${env.PORT}/api/health\n`);
});

// Graceful shutdown — garante que conexões ativas terminem antes de encerrar
const shutdown = (signal: string) => {
  console.log(`\n${signal} recebido. Encerrando servidor...`);
  server.close(() => {
    console.log('Servidor encerrado.');
    process.exit(0);
  });
  // Forçar encerramento após 10s se não fechar
  setTimeout(() => {
    console.error('Forçando encerramento após timeout.');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
