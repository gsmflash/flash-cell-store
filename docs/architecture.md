# Arquitetura — Flash Cell Store

## Visão geral

O Flash Cell Store é um monorepo pnpm com três pacotes independentes que se comunicam entre si de forma controlada.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Monorepo pnpm                           │
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │   @flash-cell/  │    │  @flash-cell/   │    │ @flash-cell/│ │
│  │    frontend     │───▶│    shared       │◀───│   backend   │ │
│  │  React + Vite   │    │  Tipos comuns   │    │  Express +  │ │
│  │  Tailwind CSS   │    │                 │    │  Drizzle    │ │
│  └────────┬────────┘    └─────────────────┘    └──────┬──────┘ │
│           │ HTTP /api/*                               │         │
│           └───────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                                                        │
                                               ┌────────▼────────┐
                                               │   PostgreSQL    │
                                               │   (32 tabelas)  │
                                               └─────────────────┘
```

---

## Pacotes do monorepo

### `@flash-cell/shared`

Pacote de tipos TypeScript compartilhados entre frontend e backend. Sem dependências externas, sem build necessário em desenvolvimento.

- **Exporta:** `ApiResponse<T>`, `PaginatedResponse<T>`, `ApiError`
- **Estratégia:** `"main": "./src/index.ts"` — Vite e tsx leem TypeScript diretamente
- **Quando há build necessário:** apenas para produção/deploy do frontend

### `@flash-cell/backend`

API REST em Node.js + Express 4 + TypeScript.

- **Entry point:** `src/index.ts` → cria o servidor e conecta ao banco
- **App:** `src/app.ts` → configura middlewares (helmet, cors, json) e rotas
- **Banco:** Drizzle ORM com driver `pg` (pool de conexões)
- **Hot reload em dev:** `tsx watch src/index.ts`
- **Build de produção:** `tsc` → `dist/`

### `@flash-cell/frontend`

SPA React com Vite.

- **Em dev:** Vite proxy redireciona `/api/*` para `localhost:3001`
- **Em produção:** `VITE_API_URL` aponta para a URL da API hospedada
- **SPA routing:** `public/_redirects` garante que todas as rotas sejam servidas pelo `index.html` no Cloudflare Pages

---

## Fluxo de dados

```
Usuário
  │
  ▼
React (SPA)
  │
  │  fetch('/api/...')
  │  Authorization: Bearer <token>
  ▼
Express API
  │
  ├── Middleware: helmet (headers de segurança)
  ├── Middleware: cors (origem configurável)
  ├── Middleware: express.json (parse do body)
  ├── Middleware: authenticate (verifica JWT)
  │
  ├── Router /api/auth → auth.ts
  ├── Router /api/health → health.ts
  │   (próximas etapas: products, orders, etc.)
  │
  └── Middleware: errorHandler (respostas de erro padronizadas)
        │
        ▼
      Drizzle ORM
        │
        ▼
      PostgreSQL
```

---

## Autenticação

O sistema usa JWT com dois tokens:

```
Login (POST /api/auth/login)
  │
  ▼
Verifica e-mail + bcrypt hash
  │
  ▼
Gera par de tokens:
  ├── accessToken  — JWT, expira em 7 dias (configurável via JWT_EXPIRES_IN)
  └── refreshToken — JWT, expira em 30 dias (configurável via JWT_REFRESH_EXPIRES_IN)

Payload do token: { sub: uuid, email: string, role: 'admin'|'technician'|'customer' }

Renovação (POST /api/auth/refresh)
  │
  ▼
Verifica refreshToken
  │
  ▼
Gera novo par de tokens
```

**Fluxo de autorização:**

```
Request com Authorization: Bearer <token>
  │
  ▼
authenticate middleware → verifyToken(token) → req.user = payload
  │
  ▼
authorize('admin') OU adminOnly OU staffOnly
  │
  ▼
Handler da rota
```

---

## Banco de dados

### Estratégia de migrations

- Drizzle Kit gerencia migrations em `backend/drizzle/`
- Workflow: editar schema → `pnpm db:generate` → revisar SQL → `pnpm db:migrate`
- **Nunca** usar `db:push` em produção (sem histórico de migrations)

### Organização dos schemas

Cada arquivo de schema cobre um módulo funcional:

```
backend/src/db/schema/
├── enums.ts          # Todos os pgEnum (13 tipos)
├── users.ts          # users, profiles
├── customers.ts      # customers, addresses
├── catalog.ts        # brands, categories, products, product_images
├── stock.ts          # stock, stock_movements, suppliers
├── service-orders.ts # service_orders + 9 tabelas relacionadas
├── warranties.ts     # warranties
├── commerce.ts       # coupons, orders, order_items, carts, cart_items, favorites
├── payments.ts       # payment_history
├── store.ts          # banners, store_settings
├── logs.ts           # system_logs
└── index.ts          # barrel — re-exporta tudo
```

### Decisão de design: `customers` separado de `users`

- `users` = conta de acesso ao sistema (login, senha, role)
- `customers` = registro de cliente (pode existir sem conta)
- Razão: atendimentos balcão precisam de registro de cliente sem que a pessoa tenha login
- `customers.userId` é nullable — aponta para `users.id` se o cliente tiver conta

### FK self-referencial em `categories`

```typescript
parentId: uuid('parent_id').references((): AnyPgColumn => categories.id, { onDelete: 'set null' })
```

- Usa `AnyPgColumn` (não `AnyColumn`) — tipo correto para o driver pg do Drizzle
- Permite hierarquia ilimitada de categorias
- `onDelete: 'set null'` — remover categoria pai não remove filhos

---

## Decisões arquiteturais

### Por que pnpm workspaces sem Turborepo?

- Turborepo adiciona complexidade de cache e pipeline para um projeto que ainda está crescendo
- pnpm workspaces puro é suficiente para o tamanho atual
- Migração para Turborepo é simples se o build paralelo se tornar lento no futuro

### Por que Express 4 e não Express 5 ou Fastify?

- Express 4 é estável, com ecossistema maduro e amplamente documentado
- Express 5 ainda está em beta
- Fastify seria mais performático, mas introduz uma curva de aprendizado desnecessária neste momento

### Por que Drizzle ORM e não Prisma?

- Drizzle gera SQL mais previsível e transparente
- Schema como código TypeScript puro (sem linguagem DSL própria)
- Melhor integração com ambientes serverless e edge
- Migrations gerenciadas explicitamente (mais controle)

### Por que `shared` exporta TypeScript direto?

- Vite e `tsx` leem `.ts` nativamente — sem necessidade de compilar em dev
- Simplifica o DX: editar um tipo em `shared` reflete imediatamente em frontend e backend
- Em produção, o build do frontend compila via Vite (o pacote `shared/` existe na estrutura do monorepo, mas não é usado pelo código hoje)

### Por que o proxy Vite em dev?

- Elimina problemas de CORS durante o desenvolvimento
- Frontend e backend rodam em portas diferentes (`5173` e `3001`)
- Em produção, a URL da API é configurada via `VITE_API_URL`

---

## Padrões de resposta da API

Todos os endpoints respondem no mesmo formato:

```typescript
// Sucesso
{ status: 'ok', data: T }

// Erro
{ status: 'error', message: string }

// Lista paginada
{ status: 'ok', data: T[], meta: { total, page, perPage, totalPages } }
```

---

## Segurança

| Medida | Implementação |
|---|---|
| Headers HTTP | `helmet` (CSP, HSTS, X-Frame-Options, etc.) |
| CORS | Origem restrita via `env.CORS_ORIGIN` |
| Senhas | bcryptjs, salt rounds: 12 |
| JWT | HS256, payload mínimo, expiração configurável |
| Validação de input | Zod em todas as rotas |
| Variáveis de ambiente | Zod valida no startup — falha rápido se faltam vars obrigatórias |
| SQL injection | Impossível via Drizzle ORM (queries parametrizadas) |

---

## Considerações de escalabilidade

O sistema foi desenhado para crescer de forma incremental:

1. **Banco de dados:** Pool de conexões pg — basta aumentar `max` no pool
2. **API:** Stateless (JWT) — pode rodar em múltiplas instâncias sem sticky sessions
3. **Frontend:** SPA estático no CDN (Cloudflare Pages) — escala automaticamente
4. **Arquivos:** Cloudflare R2 para uploads (produtos, banners, logos)
5. **Cache:** Redis pode ser adicionado para sessões de carrinho e rate limiting

---

## Independência de plataforma

O projeto não tem dependências do Replit ou de qualquer outra plataforma de hospedagem específica:

- Sem SDKs proprietários
- Sem variáveis de ambiente específicas de plataforma
- Banco de dados via `DATABASE_URL` padrão
- Pode rodar em qualquer ambiente com Node.js 20+ e PostgreSQL 15+
- Deploy documentado para Cloudflare Pages + Railway/Render (ver `DEPLOY.md`)
