# Guia de Desenvolvimento

## Setup inicial

```bash
# 1. Clone o repositório
git clone <url>
cd flash-cell-store

# 2. Instale as dependências
pnpm install

# 3. Configure as variáveis de ambiente
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edite backend/.env com suas credenciais PostgreSQL

# 4. (Opcional) Crie o banco de dados local
createdb flash_cell_store

# 5. Suba o schema no banco
pnpm db:push

# 6. Inicie os servidores
pnpm dev:backend   # http://localhost:3001
pnpm dev:frontend  # http://localhost:5173
```

## Comandos úteis

```bash
# Verificação de tipos em todos os pacotes
pnpm typecheck

# Apenas backend
pnpm --filter @flash-cell/backend run typecheck

# Apenas frontend
pnpm --filter @flash-cell/frontend run typecheck

# Health check da API
curl http://localhost:3001/api/health
```

## Adicionando componentes shadcn/ui

```bash
cd frontend
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add card
# etc.
```

## Adicionando tabelas ao banco

1. Crie o schema em `backend/src/db/schema/nome-tabela.ts`
2. Exporte em `backend/src/db/schema/index.ts`
3. Gere a migration: `pnpm db:generate`
4. Aplique: `pnpm db:migrate` (ou `pnpm db:push` em dev)

## Variáveis de ambiente

| Variável | Onde | Obrigatória |
|---|---|---|
| `DATABASE_URL` | backend/.env | ✅ |
| `PORT` | backend/.env | ❌ (default: 3001) |
| `CORS_ORIGIN` | backend/.env | ❌ (default: http://localhost:5173) |
| `NODE_ENV` | backend/.env | ❌ (default: development) |
| `VITE_API_URL` | frontend/.env | ❌ (usa proxy Vite em dev) |
