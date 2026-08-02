# Flash Cell Store

Sistema completo de gerenciamento para loja de celulares — vendas, estoque, ordens de serviço e e-commerce.

> **Estado atual:** Etapa 2 concluída — schema completo do banco de dados e autenticação JWT implementados.

---

## Sumário

- [Visão geral](#visão-geral)
- [Stack tecnológica](#stack-tecnológica)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e configuração](#instalação-e-configuração)
- [Rodando em desenvolvimento](#rodando-em-desenvolvimento)
- [Scripts disponíveis](#scripts-disponíveis)
- [Banco de dados](#banco-de-dados)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Documentação adicional](#documentação-adicional)
- [Roadmap](#roadmap)
- [Contribuindo](#contribuindo)

---

## Visão geral

O Flash Cell Store é um sistema de gestão desenvolvido para lojas de celulares e assistências técnicas. Ele cobre:

- **Loja virtual** (e-commerce com carrinho, pedidos, cupons)
- **PDV / Atendimento balcão** (clientes sem conta, venda direta)
- **Ordens de serviço** (recebimento, diagnóstico, peças, entrega)
- **Controle de estoque** (entrada, saída, ajustes, fornecedores)
- **Catálogo de produtos** (marcas, categorias hierárquicas, variantes)
- **Gestão de garantias**
- **Painel administrativo** com relatórios

---

## Stack tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite 5 + TypeScript + Tailwind CSS 3 + shadcn/ui |
| Backend | Node.js 20 + Express 4 + TypeScript |
| ORM | Drizzle ORM |
| Banco de dados | PostgreSQL 15+ |
| Autenticação | JWT (access 7d + refresh 30d) + bcryptjs |
| Validação | Zod |
| Monorepo | pnpm workspaces |
| Deploy frontend | Cloudflare Pages |
| Deploy backend | Railway / Render / VPS |
| Armazenamento de arquivos | Cloudflare R2 |

---

## Estrutura do projeto

```
flash-cell-store/
├── package.json              # Raiz do workspace — scripts globais
├── pnpm-workspace.yaml       # Declaração dos pacotes do monorepo
├── tsconfig.base.json        # Configuração TypeScript compartilhada
├── .env.example              # Variáveis de ambiente do projeto
├── .gitignore
│
├── shared/                   # Pacote @flash-cell/shared
│   └── src/
│       └── types/index.ts    # Tipos compartilhados (ApiResponse, etc.)
│
├── backend/                  # Pacote @flash-cell/backend
│   ├── src/
│   │   ├── config/env.ts     # Validação de variáveis de ambiente (Zod)
│   │   ├── db/
│   │   │   ├── index.ts      # Conexão com o banco (pg + drizzle)
│   │   │   ├── seed.ts       # Seed: admin + configurações iniciais
│   │   │   └── schema/       # Schemas Drizzle ORM (32 tabelas)
│   │   ├── lib/
│   │   │   ├── hash.ts       # bcryptjs (hashPassword, comparePassword)
│   │   │   └── jwt.ts        # JWT (signAccessToken, signRefreshToken)
│   │   ├── middleware/
│   │   │   ├── auth.ts       # authenticate, authorize, adminOnly, staffOnly
│   │   │   ├── errorHandler.ts
│   │   │   └── notFound.ts
│   │   ├── routes/
│   │   │   ├── auth.ts       # POST /login, /register, /refresh | GET /me
│   │   │   ├── health.ts     # GET /api/health
│   │   │   └── index.ts      # Agregador de rotas
│   │   ├── app.ts            # Express app (cors, helmet, rotas)
│   │   └── index.ts          # Entry point + graceful shutdown
│   ├── drizzle/              # Migrations SQL geradas automaticamente
│   ├── drizzle.config.ts
│   └── .env.example
│
├── frontend/                 # Pacote @flash-cell/frontend
│   ├── src/
│   │   ├── lib/
│   │   │   ├── api.ts        # Cliente HTTP (fetch wrapper)
│   │   │   └── utils.ts      # Utilitários (cn, etc.)
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css         # Variáveis CSS do shadcn/ui
│   ├── public/_redirects     # SPA routing para Cloudflare Pages
│   ├── vite.config.ts        # Proxy /api → localhost:3001 em dev
│   └── .env.example
│
└── docs/                     # Documentação técnica detalhada
    ├── ARCHITECTURE.md
    ├── API.md
    ├── DATABASE.md
    ├── DEPLOY.md
    ├── ROADMAP.md
    └── TODO.md
```

---

## Pré-requisitos

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0 (`npm install -g pnpm`)
- **PostgreSQL** >= 15

### Instalando pnpm

```bash
npm install -g pnpm
```

---

## Instalação e configuração

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd flash-cell-store
```

### 2. Instale as dependências

```bash
pnpm install
```

### 3. Configure as variáveis de ambiente

```bash
# Backend
cp backend/.env.example backend/.env
# Edite backend/.env com suas configurações

# Frontend (opcional em dev — usa proxy Vite)
cp frontend/.env.example frontend/.env
```

### 4. Crie e popule o banco de dados

```bash
# Aplica as migrations (cria todas as 32 tabelas)
pnpm db:migrate

# Cria o usuário admin e configurações iniciais
pnpm --filter @flash-cell/backend run db:seed
```

**Credenciais do admin após o seed:**
- E-mail: `admin@flashcell.com`
- Senha: `Admin@12345`
- ⚠️ Altere a senha imediatamente após o primeiro login.

---

## Rodando em desenvolvimento

### Backend e frontend juntos

```bash
pnpm dev
```

Isso inicia em paralelo:
- Backend em `http://localhost:3001`
- Frontend em `http://localhost:5173`

> O Vite redireciona automaticamente `/api/*` para `localhost:3001` — sem necessidade de configurar CORS em desenvolvimento.

### Apenas o backend

```bash
pnpm dev:backend
```

### Apenas o frontend

```bash
pnpm dev:frontend
```

---

## Scripts disponíveis

### Raiz do monorepo

| Script | Descrição |
|---|---|
| `pnpm dev` | Inicia backend e frontend em modo watch |
| `pnpm dev:backend` | Apenas o backend |
| `pnpm dev:frontend` | Apenas o frontend |
| `pnpm build` | Build de produção (backend → frontend) |
| `pnpm typecheck` | Verifica tipos TypeScript em todos os pacotes |
| `pnpm db:generate` | Gera arquivos SQL de migration (Drizzle Kit) |
| `pnpm db:migrate` | Aplica migrations no banco de dados |
| `pnpm db:push` | Aplica schema direto sem migration (cuidado em prod) |
| `pnpm db:studio` | Abre o Drizzle Studio (GUI do banco) |

### Backend (via `pnpm --filter @flash-cell/backend run <script>`)

| Script | Descrição |
|---|---|
| `dev` | tsx watch — hot reload |
| `build` | Compila TypeScript para `dist/` |
| `start` | Inicia a versão compilada (`dist/index.js`) |
| `typecheck` | Verifica tipos sem gerar arquivos |
| `db:generate` | Gera migrations |
| `db:migrate` | Aplica migrations |
| `db:push` | Push direto ao banco (sem migration) |
| `db:studio` | Drizzle Studio |
| `db:seed` | Popula dados iniciais |

---

## Banco de dados

O schema completo está em `backend/src/db/schema/` e contempla 32 tabelas organizadas em módulos:

| Módulo | Tabelas |
|---|---|
| Usuários | `users`, `profiles` |
| Clientes | `customers`, `addresses` |
| Catálogo | `brands`, `categories`, `products`, `product_images` |
| Estoque | `stock`, `stock_movements`, `suppliers` |
| Ordens de Serviço | `service_orders`, `technicians`, `defects`, `services_catalog`, `diagnoses`, `services_performed`, `parts_used`, `service_order_history`, `entry_checklist`, `exit_checklist` |
| Garantias | `warranties` |
| Comércio | `coupons`, `orders`, `order_items`, `carts`, `cart_items`, `favorites` |
| Pagamentos | `payment_history` |
| Loja | `banners`, `store_settings` |
| Logs | `system_logs` |

Para documentação detalhada: [`docs/DATABASE.md`](docs/DATABASE.md)

---

## Variáveis de ambiente

### Backend (`backend/.env`)

```env
# Banco de dados
DATABASE_URL=postgresql://usuario:senha@localhost:5432/flash_cell_store

# Servidor
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# JWT — use dois segredos DIFERENTES e longos/aleatórios em produção
JWT_ACCESS_SECRET=seu-segredo-de-access-token-aqui
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=seu-segredo-de-refresh-token-aqui-diferente-do-anterior
JWT_REFRESH_EXPIRES_IN=30d
```

### Frontend (`frontend/.env`)

```env
# Usado apenas em produção (em dev o proxy Vite cuida disso)
VITE_API_URL=https://api.seudominio.com
```

---

## Documentação adicional

| Documento | Conteúdo |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Arquitetura, decisões técnicas, fluxo de dados |
| [`docs/API.md`](docs/API.md) | Todos os endpoints (implementados e planejados) |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Tabelas, campos, relacionamentos, enums |
| [`docs/DEPLOY.md`](docs/DEPLOY.md) | Deploy em produção passo a passo |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Etapas do desenvolvimento |
| [`docs/TODO.md`](docs/TODO.md) | Funcionalidades pendentes por prioridade |

---

## Roadmap

| Etapa | Status | Descrição |
|---|---|---|
| 1 | ✅ Concluída | Estrutura base do monorepo |
| 2 | ✅ Concluída | Schema do banco + autenticação JWT |
| 3 | 🔜 Próxima | CRUD de catálogo (marcas, categorias, produtos) |
| 4 | ⏳ Planejada | Gestão de estoque |
| 5 | ⏳ Planejada | Ordens de serviço |
| 6 | ⏳ Planejada | Pedidos e e-commerce |
| 7 | ⏳ Planejada | Frontend — páginas e componentes |
| 8 | ⏳ Planejada | Painel administrativo |
| 9 | ⏳ Planejada | Integração de pagamentos |
| 10 | ⏳ Planejada | Deploy, CI/CD e monitoramento |

---

## Contribuindo

1. Crie uma branch a partir de `main`: `git checkout -b feat/nome-da-feature`
2. Siga as convenções de commits: `feat:`, `fix:`, `docs:`, `refactor:`
3. Verifique os tipos antes de commitar: `pnpm typecheck`
4. Abra um Pull Request descrevendo as mudanças

---

*Flash Cell Store — desenvolvido com TypeScript, Drizzle ORM e muita organização.*
