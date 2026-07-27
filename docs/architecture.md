# Arquitetura — Flash Cell Store

## Visão geral

Monorepo com três pacotes principais:

| Pacote | Descrição | Tecnologias |
|---|---|---|
| `@flash-cell/frontend` | Interface web | React, Vite, Tailwind, shadcn/ui |
| `@flash-cell/backend` | API REST | Express 4, Drizzle ORM, Zod |
| `@flash-cell/shared` | Tipos e schemas | TypeScript, Zod |

## Fluxo de dados

```
Browser
  └─► Cloudflare Pages (frontend/dist/)
        └─► /api/* → Backend (Railway/Render)
              └─► PostgreSQL
              └─► Cloudflare R2 (imagens)
```

Em desenvolvimento, o proxy do Vite (`/api → http://localhost:3001`) elimina a necessidade de CORS.

## Decisões arquiteturais

### 1. Monorepo com pnpm workspaces
- Compartilhamento de tipos sem publicar pacotes npm
- Um único `pnpm install` instala tudo
- Scripts globais (`pnpm typecheck`) rodam em todos os pacotes

### 2. Shared package exporta TypeScript direto
- `"main": "./src/index.ts"` — sem build necessário em dev
- Vite e tsx leem `.ts` nativamente
- Para produção, cada pacote compila/bundle os sources

### 3. Validação de env com Zod no startup do backend
- Falha explícita e imediata se variável obrigatória faltar
- Evita erros silenciosos em produção
- Tipo `Env` derivado automaticamente do schema

### 4. Proxy Vite em desenvolvimento
- Frontend chama `/api/...` sem especificar host
- Vite redireciona para `http://localhost:3001`
- Em produção, `VITE_API_URL` substitui o prefixo

## Estrutura de pastas

```
flash-cell-store/
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes React
│   │   │   └── ui/          # shadcn/ui (gerado pelo CLI)
│   │   ├── hooks/           # Custom hooks
│   │   ├── lib/             # Utilitários (utils.ts, api.ts)
│   │   ├── pages/           # Páginas da aplicação
│   │   ├── stores/          # Estado global (futuro)
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── components.json      # Config shadcn/ui
│   ├── tailwind.config.ts
│   └── vite.config.ts
├── backend/
│   ├── src/
│   │   ├── config/          # env.ts (validação com Zod)
│   │   ├── db/              # Drizzle + Pool PostgreSQL
│   │   │   └── schema/      # Tabelas do banco
│   │   ├── middleware/      # errorHandler, notFound
│   │   ├── routes/          # Rotas da API
│   │   ├── app.ts           # Express app
│   │   └── index.ts         # Entry point + graceful shutdown
│   └── drizzle.config.ts
├── shared/
│   └── src/
│       └── types/           # Tipos compartilhados
└── docs/
```
