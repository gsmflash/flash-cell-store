# TODO — Flash Cell Store

Funcionalidades pendentes organizadas por prioridade. Atualizar à medida que itens forem concluídos.

> **Legenda:** 🔴 Crítico | 🟠 Alta | 🟡 Média | 🟢 Baixa | ✅ Concluído

---

## 🔴 Prioridade Crítica

Bloqueiam o funcionamento mínimo do sistema.

- [x] **Etapa 3** — CRUD de catálogo (marcas, categorias, produtos)
  - Sem produtos, nenhum outro módulo funciona corretamente
- [x] **Etapa 4** — Gestão de estoque e movimentações
  - Pedidos e OS dependem de controle de inventário
- [x] **Etapa 5** — Ordens de serviço (exceto geração de PDF, ver ROADMAP.md)
  - Núcleo do negócio de assistência técnica
- [x] **Etapa 6** — Pedidos e carrinho
  - Núcleo do negócio de vendas
- [x] **Etapa 7** — Frontend: carrinho, checkout, meus pedidos, minha conta (exceto toasts)
- [x] **Etapa 8** — Painel administrativo (exceto upload de imagem para R2, ver ROADMAP.md)
- [x] **Etapa 9** — Pagamentos com Mercado Pago (código pronto, **não testado contra a API real** — ver ROADMAP.md)
- [x] **Etapa 10** — Garantias e pós-venda (código pronto, e-mail via Resend **não testado** — ver ROADMAP.md)
- [x] **Etapa 11** — Deploy e CI/CD (config pronta no código; publicar de verdade depende das suas contas — ver ROADMAP.md)
- [x] **Etapa 12** — Qualidade e monitoramento (exceto SDK real do Sentry — ver ROADMAP.md)
- [x] **Fase Final** — WhatsApp (link direto), SEO básico, relatórios de vendas/OS — ver ROADMAP.md

---

## 🟠 Alta Prioridade

Necessários para a operação diária, mas não bloqueiam completamente.

### Backend

- [x] Função utilitária de paginação reutilizável (`lib/pagination.ts`)
- [x] Função utilitária de geração de slug (`lib/slugify.ts`)
- [x] Função utilitária de geração de número sequencial de OS (`lib/osNumber.ts`)
- [x] Serviço de clientes (busca, criação, edição)
- [x] Middleware de rate limiting (auth) — implementado em memória; ver nota abaixo sobre limitação para múltiplas instâncias
- [x] Middleware de rate limiting nas demais rotas públicas — teto geral em toda a API desde a Etapa 12 (`app.ts`)
- [ ] Atualização de `updatedAt` automática (trigger ou hook Drizzle)
- [x] Tratamento de erros do banco (unique/foreign key/not-null violation → mensagens legíveis, `lib/dbErrors.ts`)
- [ ] Validação de CPF/CNPJ no registro de clientes

### Frontend

- [x] Páginas de autenticação (login, registro) — recuperação de senha ainda falta
- [x] Hook `useAuth` com Context API
- [x] Cliente HTTP com interceptor de refresh token automático
- [x] Página home (banners + destaques)
- [x] Listagem de produtos (com filtros de marca/categoria)
- [x] Detalhe do produto
- [x] Carrinho (drawer, anônimo + logado, com fusão no login)
- [x] Checkout (endereço, cupom, resumo)
- [x] Meus pedidos / detalhe do pedido / cancelamento
- [x] Minha conta (perfil + endereços)
- [ ] Toast de notificações (feedback hoje é inline nos formulários)
- [ ] Recuperação de senha (esqueci minha senha)

### Infraestrutura

- [ ] Configurar Cloudflare R2 para upload de imagens
- [ ] Endpoint de upload de imagens (`POST /api/upload`)

---

## 🟡 Média Prioridade

Melhoram a experiência mas não bloqueiam a operação.

### Backend

- [x] Endpoint `GET /api/reports/dashboard` com métricas básicas — implementado como `/api/dashboard/stats` (Etapa 8) + `/api/reports/sales` e `/api/reports/service-orders` (Fase Final)
- [ ] Busca full-text em produtos (PostgreSQL `tsquery`)
- [ ] Filtros avançados de produtos (faixa de preço, disponibilidade)
- [ ] Geração de PDF de OS (usando `pdfkit` ou `puppeteer`)
- [ ] E-mail de confirmação de cadastro
- [ ] E-mail de notificação de status de OS/pedido
- [ ] Webhook de pagamento (Mercado Pago)
- [ ] Integração de pagamento (Mercado Pago SDK)
- [ ] Relatório de vendas por período
- [ ] Relatório de OS por status/técnico
- [ ] Endpoint de validação de cupom

### Frontend

- [ ] Painel administrativo (layout base)
- [ ] Admin: CRUD de produtos com upload de imagens
- [ ] Admin: CRUD de categorias (árvore visual)
- [ ] Admin: lista e gestão de pedidos
- [ ] Admin: lista e gestão de OS
- [ ] Admin: dashboard de métricas
- [ ] Página "Meus pedidos" (cliente)
- [ ] Página "Meu perfil" (cliente)
- [ ] Checkout com endereço e cupom
- [ ] Toast de notificações

### Segurança

- [x] Access e refresh token com secrets independentes e claim `type` (`lib/jwt.ts`)
- [x] Limite de tentativas de login por conta (`lib/loginAttempts.ts`) e rate limiting por IP nas rotas de auth (`middleware/rateLimiter.ts`)
  > Nota: implementação em memória, válida para uma única instância do backend. Se o backend passar a rodar em múltiplas réplicas, migrar para um store compartilhado (Redis).
- [ ] Refresh token deve ser invalidado após o uso (rotação)
- [ ] Blacklist de tokens revogados (Redis ou tabela no banco)
- [ ] Verificação de e-mail no registro

---

## 🟢 Baixa Prioridade

Melhorias e funcionalidades secundárias.

### Backend

- [ ] Testes unitários (Vitest) para serviços de auth, estoque, pedidos
- [ ] Testes de integração para as principais rotas
- [x] Documentação interativa da API — `backend/openapi.yaml` (OpenAPI 3.0), servido em `GET /api/docs/openapi.yaml`, sem depender de `swagger-ui-express`
- [ ] Compressão de resposta gzip (`compression` middleware)
- [ ] Cache de listagem de produtos (Redis)
- [ ] Exportação de dados em CSV (clientes, pedidos, OS)
- [ ] Importação de produtos em bulk via CSV
- [ ] API de busca autocomplete (produtos por nome/SKU)
- [ ] Logs de auditoria automáticos para criação/edição de entidades críticas
- [ ] Endpoint de saúde detalhado (`/api/health/detailed` com status do banco)

### Frontend

- [ ] PWA (service worker + manifest)
- [ ] Busca em tempo real com debounce
- [ ] Filtros de produto na URL (para compartilhar e indexar)
- [ ] Galeria de imagens com zoom
- [ ] Comparação de produtos
- [ ] Avaliações e comentários de produtos
- [ ] Página de rastreio de pedido
- [ ] Consulta pública de garantia por número de série
- [ ] Modo escuro (dark mode)
- [ ] Internacionalização (i18n) — preparação

### DevOps / Qualidade

- [ ] GitHub Actions: CI (typecheck + build) em todo PR
- [ ] GitHub Actions: CD (deploy automático ao mesclar na main)
- [ ] Monitoramento de erros com Sentry — ponto de extensão pronto em `lib/errorReporting.ts` (comentado), SDK real (`@sentry/node`) ainda não instalado
- [ ] Alertas de estoque baixo (e-mail/WhatsApp) — o link direto de WhatsApp para contato do cliente já existe (Fase Final), mas isso é diferente: um alerta automático pro lojista quando o estoque ficar baixo, que ainda não existe
- [ ] Backup automático do banco de dados

---

## ✅ Concluído

- [x] Estrutura do monorepo pnpm (packages: shared, backend, frontend)
- [x] TypeScript configurado nos três pacotes
- [x] Tipos compartilhados (`ApiResponse`, `PaginatedResponse`, `ApiError`)
- [x] Scaffold do frontend (React 18 + Vite 5 + Tailwind CSS 3 + shadcn/ui)
- [x] Scaffold do backend (Express 4 + Drizzle ORM)
- [x] Validação de variáveis de ambiente com Zod no startup
- [x] Conexão com PostgreSQL (pool pg + Drizzle)
- [x] Rota `GET /api/health`
- [x] 13 enums PostgreSQL
- [x] 32 tabelas com Drizzle ORM e relações
- [x] Migration SQL gerada (730 linhas)
- [x] Hash de senhas com bcryptjs (salt rounds 12)
- [x] Geração e verificação de JWT (access + refresh)
- [x] Middleware `authenticate` (Bearer JWT)
- [x] Middlewares `authorize`, `adminOnly`, `staffOnly`
- [x] `POST /api/auth/login` com validação Zod
- [x] `POST /api/auth/register` com validação Zod
- [x] `POST /api/auth/refresh`
- [x] `GET /api/auth/me` (protegida)
- [x] Script de seed (admin + store_settings)
- [x] Proxy Vite: `/api` → `localhost:3001` em dev
- [x] Build de produção do frontend testado
- [x] `.gitignore`, `.env.example`, documentação
- [x] Git inicializado com 2 commits (Etapa 1 e Etapa 2)
