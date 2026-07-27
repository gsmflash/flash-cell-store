# Flash Cell Store

Loja de celulares — monorepo com frontend React + backend Node.js.

## Estrutura

```
flash-cell-store/
├── frontend/    # React + Vite + TypeScript + Tailwind + shadcn/ui
├── backend/     # Node.js + Express + TypeScript + Drizzle ORM
├── shared/      # Tipos e schemas Zod compartilhados
└── docs/        # Documentação técnica
```

## Requisitos

- Node.js >= 20
- pnpm >= 9
- PostgreSQL

## Setup inicial

```bash
# 1. Instalar dependências
pnpm install

# 2. Configurar variáveis de ambiente
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edite os arquivos .env com seus valores

# 3. Rodar em desenvolvimento
pnpm dev:backend   # backend em http://localhost:3001
pnpm dev:frontend  # frontend em http://localhost:5173
```

## Comandos disponíveis

| Comando | Descrição |
|---|---|
| `pnpm dev:backend` | Inicia o backend com hot-reload |
| `pnpm dev:frontend` | Inicia o frontend Vite |
| `pnpm typecheck` | Verifica tipos em todos os pacotes |
| `pnpm build` | Build de produção completo |
| `pnpm db:generate` | Gera migrations Drizzle |
| `pnpm db:migrate` | Aplica migrations |
| `pnpm db:push` | Push do schema (dev only) |
| `pnpm db:studio` | Abre Drizzle Studio |

## Deploy

- **Frontend**: Cloudflare Pages — build `pnpm --filter @flash-cell/frontend run build`, pasta `frontend/dist`
- **Backend**: Railway / Render — `pnpm --filter @flash-cell/backend run start`

Veja `docs/deployment.md` para instruções detalhadas.
