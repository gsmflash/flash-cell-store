// Executado pelo Vitest antes de qualquer arquivo de teste. Necessário
// porque backend/src/config/env.ts valida process.env com Zod no momento
// do import e encerra o processo (process.exit) se algo estiver ausente ou
// inválido — nos testes, nunca temos um .env real (nem deveríamos precisar
// de um banco de dados real para testar funções puras).

process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-com-32-caracteres-no-minimo';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-diferente-e-com-32-chars';
process.env.JWT_REFRESH_EXPIRES_IN = '30d';
