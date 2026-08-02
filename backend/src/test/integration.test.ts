import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';

/**
 * IMPORTANTE — leia antes de adicionar mais testes aqui:
 *
 * Este ambiente de desenvolvimento não tem Postgres disponível (sem rede).
 * `new Pool()` do driver `pg` só conecta de verdade quando uma query roda —
 * então testes que nunca chegam a tocar o banco (falha de validação antes
 * da query, 404, health check, rejeição de auth por token ausente/inválido)
 * funcionam aqui sem problema. Testes que dependem de uma consulta real ao
 * banco (login válido, listagem de produtos, etc.) NÃO estão aqui — eles
 * precisam de um banco de teste de verdade (ver docs/DEPLOY.md ou rodar
 * localmente com DATABASE_URL apontando para um Postgres de teste).
 */

describe('GET /api/health', () => {
  it('responde 200 com status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('rotas inexistentes', () => {
  it('responde 404 para uma rota que não existe', async () => {
    const res = await request(app).get('/api/isso-nao-existe');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/auth/login — validação (sem tocar o banco)', () => {
  it('rejeita corpo vazio com 400', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('rejeita e-mail em formato inválido com 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'não-é-email', password: 'qualquercoisa' });
    expect(res.status).toBe(400);
  });

  it('rejeita senha ausente com 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'teste@flashcell.com' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/register — validação de senha (sem tocar o banco)', () => {
  it('rejeita senha curta demais', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Teste',
      email: 'teste@flashcell.com',
      password: '123',
    });
    expect(res.status).toBe(400);
  });

  it('rejeita senha sem letra maiúscula', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Teste',
      email: 'teste@flashcell.com',
      password: 'senhasemmaiuscula1',
    });
    expect(res.status).toBe(400);
  });
});

describe('Rotas protegidas rejeitam requisição sem token', () => {
  it('POST /api/products sem Authorization retorna 401', async () => {
    const res = await request(app).post('/api/products').send({ name: 'Produto Teste', sellPrice: 10 });
    expect(res.status).toBe(401);
  });

  it('GET /api/orders sem Authorization retorna 401', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(401);
  });

  it('token malformado retorna 401, não 500', async () => {
    const res = await request(app).get('/api/orders').set('Authorization', 'Bearer token-invalido-qualquer');
    expect(res.status).toBe(401);
  });
});

describe('CORS', () => {
  it('libera o header X-Session-Id no preflight (necessário para o carrinho anônimo)', async () => {
    const res = await request(app)
      .options('/api/cart')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'X-Session-Id');

    expect(res.headers['access-control-allow-headers']?.toLowerCase()).toContain('x-session-id');
  });
});
