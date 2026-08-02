# Roadmap — Flash Cell Store

Desenvolvimento dividido em etapas incrementais. Cada etapa termina em código testado, tipado e commitado no Git.

---

## ✅ Etapa 1 — Estrutura base do monorepo

**Status:** Concluída

- Monorepo pnpm com três pacotes: `shared`, `backend`, `frontend`
- TypeScript configurado nos três pacotes
- Pacote `shared` com tipos base (`ApiResponse`, `PaginatedResponse`, `ApiError`)
- Frontend: React 18 + Vite 5 + Tailwind CSS 3 + shadcn/ui scaffolding
- Backend: Express 4 + Drizzle ORM + validação de env com Zod
- Rota `/api/health` funcionando
- `.gitignore`, `.env.example`, `README.md`, documentação base
- Build de produção do frontend funcionando

---

## ✅ Etapa 2 — Schema do banco + autenticação

**Status:** Concluída

- 13 enums PostgreSQL tipados
- 32 tabelas Drizzle ORM cobrindo todos os módulos do negócio
- Migration SQL gerada (`drizzle/0000_useful_starjammers.sql`)
- Biblioteca de hash: bcryptjs (salt rounds 12)
- Biblioteca JWT: access token 7d + refresh token 30d
- Middlewares: `authenticate`, `authorize`, `adminOnly`, `staffOnly`
- Rotas de auth: `POST /login`, `POST /register`, `POST /refresh`, `GET /me`
- Validação Zod em todas as rotas de auth
- Script de seed: admin inicial + store_settings

---

## ✅ Etapa 3 — CRUD de catálogo

**Status:** Concluída (pendente validação local via `pnpm test`)

### Objetivo
Criar os endpoints completos para gerenciar marcas, categorias e produtos.

### Entregáveis

**Marcas (`/api/brands`)**
- [x] `GET /` — listar com paginação e busca
- [x] `GET /:id` — detalhe
- [x] `POST /` — criar (admin)
- [x] `PUT /:id` — atualizar (admin)
- [x] `DELETE /:id` — soft delete (admin)

**Categorias (`/api/categories`)**
- [x] `GET /` — listar em árvore hierárquica e como lista plana
- [x] `GET /:id` — detalhe com filhos
- [x] `POST /` — criar (admin)
- [x] `PUT /:id` — atualizar (admin)
- [x] `DELETE /:id` — soft delete (admin)

**Produtos (`/api/products`)**
- [x] `GET /` — listar com filtros (marca, categoria, preço, destaque)
- [x] `GET /:id` — detalhe com imagens e estoque
- [x] `GET /slug/:slug` — busca por slug
- [x] `POST /` — criar (admin)
- [x] `PUT /:id` — atualizar (admin)
- [x] `DELETE /:id` — soft delete (admin)
- [x] `POST /:id/images` — adicionar imagem
- [x] `DELETE /:productId/images/:imageId` — remover imagem

**Padrões a implementar nesta etapa:**
- [x] Funções de serviço separadas dos handlers (ex: `brands.service.ts`)
- [x] Paginação reutilizável
- [x] Slugs gerados automaticamente a partir do nome
- [x] Validação Zod em todos os endpoints

---

## ✅ Etapa 4 — Gestão de estoque

**Status:** Concluída (pendente validação local via `pnpm test`)

### Objetivo
Controle completo de inventário com histórico rastreável.

### Entregáveis

- [x] Fornecedores: CRUD completo (admin)
- [x] Estoque: consulta por produto e alertas de estoque baixo
- [x] Movimentações: registro de entrada, saída, ajuste, devolução, perda
- [x] Histórico de movimentações com filtros
- [x] Atualização automática de saldo ao registrar movimentação
- [x] Checagem de estoque insuficiente — implementada como função reutilizável
      `assertSufficientStock()` (não como middleware Express), para ser chamada
      pelo módulo de pedidos na Etapa 6, quando existir o formato real do
      carrinho/checkout a validar

---

## 🟡 Etapa 5 — Ordens de serviço

**Status:** Concluída, exceto geração de PDF (ver nota) — pendente validação local via `pnpm test`

### Objetivo
Sistema completo de gestão de assistência técnica.

### Entregáveis

- [x] Abertura de OS com dados do aparelho
- [x] Atribuição de técnico
- [x] Registro de diagnóstico e aprovação do cliente (via transição de status `waiting_approval` → `approved`)
- [x] Catálogo de serviços: CRUD (admin)
- [x] Catálogo de defeitos: CRUD (admin)
- [x] Registro de serviços executados
- [x] Registro de peças utilizadas (baixa automática no estoque, atômica — se o
      estoque for insuficiente, a peça nem chega a ser registrada)
- [x] Checklist de entrada e saída
- [x] Histórico de mudanças de status (com máquina de estados: transições
      inválidas, como pular etapas ou voltar um status já concluído, são
      rejeitadas)
- [x] Gerador de número sequencial de OS (OS-AAAA-NNNN), seguro contra
      concorrência via advisory lock do Postgres
- [ ] Geração de PDF da OS (para impressão) — **não implementada nesta etapa**:
      exigiria adicionar uma biblioteca de PDF ao backend, o que não deu pra
      fazer com segurança no ambiente sem acesso à internet usado para
      construir isso. Fica como próximo passo natural, isolado, sem depender
      de mais nada do resto da Etapa 5.
- [x] Técnicos: CRUD e vínculo com usuários (promove automaticamente o papel
      do usuário para `technician` ao vinculá-lo)

**Pré-requisito que não estava no roadmap mas foi necessário**: CRUD básico de
clientes (`/api/customers`), já que toda OS precisa de um `customerId` válido
e esse módulo ainda não existia.

---

## 🟡 Etapa 6 — Pedidos e e-commerce

**Status:** Concluída, exceto cálculo de frete (ver nota) — pendente validação local via `pnpm test`

### Objetivo
Fluxo completo de compra online.

### Entregáveis

- [x] Carrinho: adicionar, atualizar, remover, limpar
- [x] Carrinho anônimo (session_id) com fusão ao fazer login — endpoint
      dedicado `POST /api/cart/merge`, chamado pelo frontend logo após o
      login (optei por não embutir a fusão dentro do próprio `/auth/login`
      para não mexer de novo no módulo de auth já endurecido)
- [x] Validação de cupom e aplicação de desconto (percentual ou fixo, com
      teto de desconto, valor mínimo de pedido, limite de uso total e por
      cliente, e janela de validade)
- [x] Criação de pedido a partir do carrinho
- [x] Gerador de número sequencial de pedido (PED-AAAA-NNNN), mesma técnica
      de advisory lock usada no número da OS
- [x] Baixa automática de estoque ao confirmar pedido — atômica: se faltar
      estoque de qualquer item, o pedido inteiro é revertido, nenhum item
      fica "pela metade"
- [x] Cancelamento de pedido com reversão de estoque (só permitido antes do
      envio — depois disso o caminho correto seria devolução, não
      cancelamento)
- [x] Histórico de pedidos do cliente
- [x] Favoritos: adicionar e remover
- [ ] Cálculo de frete — **não implementado**: por ora todo pedido sai com
      `shippingCost: 0`. Não havia nenhuma definição de transportadora/regra
      de frete no roadmap original para eu seguir, então não inventei uma.

**Pré-requisito que não estava no roadmap mas foi necessário**: ponte entre
um usuário autenticado (`users`) e o registro de `customers` que
carrinho/pedido/favoritos realmente referenciam
(`getOrCreateCustomerForUser`) — criada sob demanda, na primeira vez que o
usuário interage com alguma dessas features.

---

## ✅ Etapa 7 — Frontend: páginas e componentes

**Status:** Concluída, exceto toasts de notificação (ver nota)

### Objetivo
Interface completa para clientes e lojistas.

### Entregáveis

**Autenticação**
- [x] Página de login
- [x] Página de registro
- [x] Hook `useAuth` com contexto de usuário (+ refresh automático de token)

**Loja**
- [x] Home com banners e produtos em destaque
- [x] Listagem de produtos com filtros (marca, categoria) e paginação
- [x] Página de detalhe do produto com galeria e "adicionar ao carrinho" real
- [x] Carrinho lateral (drawer) — funciona anônimo (session_id) ou logado, com
      fusão automática ao entrar
- [x] Checkout: endereço (seleção ou cadastro inline), cupom com prévia de
      desconto, resumo
- [x] Confirmação de pedido (tela de detalhe do pedido com banner de sucesso
      quando vem direto do checkout)
- [x] Página "Meus pedidos" (com cancelamento quando aplicável)
- [x] Página "Minha conta" / perfil (dados da conta + endereços salvos)

**Componentes base**
- [x] Header com busca e carrinho (badge de quantidade)
- [x] Footer
- [x] Componentes de produto (card, price tag, grid com loading/erro/vazio)
- [x] Loading e empty states
- [ ] Toast de notificações — **não implementado**: as páginas usam feedback
      inline (mensagens de erro/sucesso no próprio formulário) em vez de
      toasts globais. Funciona, mas um sistema de toast deixaria a UX mais
      polida; fica como melhoria futura de baixo risco.

**Peça de backend que faltava e precisei construir para o checkout funcionar**:
CRUD de endereços (`/api/addresses`) — o schema já existia, mas nunca tinha
sido exposto pela API. Também adicionei um endpoint de prévia de cupom
(`/api/coupon-preview`) para o checkout mostrar o desconto antes de
finalizar o pedido, sem precisar criar o pedido pra descobrir se o cupom é válido.

---

## ✅ Etapa 8 — Painel administrativo

**Status:** Concluída, exceto upload de imagem para R2 (ver nota) — pendente validação local via `pnpm test`

### Objetivo
Interface interna para gestão da loja.

### Entregáveis

- [x] Dashboard com métricas (vendas, pedidos por status, estoque baixo, OS
      em aberto, clientes, produtos) — nota: "vendas" conta pedidos criados,
      não pagos, já que o módulo de pagamentos (Etapa 9) ainda não existe
- [x] Gestão de produtos (listar, criar, editar, desativar)
- [ ] Upload de imagens para Cloudflare R2 — **não implementado**: exigiria
      credenciais reais de R2 e testar contra um bucket de verdade, o que
      não dá pra fazer com segurança neste ambiente sem internet (mesmo
      motivo do PDF na Etapa 5). Produtos e banners aceitam URL de imagem
      diretamente — funciona, só que a imagem precisa estar hospedada em
      algum lugar (ex.: você sobe manualmente num bucket e cola a URL)
- [x] Gestão de categorias (lista + seleção hierárquica de pai)
- [x] Gestão de marcas
- [x] Gestão de estoque com alertas (visualizar estoque baixo + registrar movimentação)
- [x] Gestão de pedidos (listar, avançar status — cancelamento continua
      pelo fluxo dedicado que reverte estoque)
- [x] Gestão de OS (listar, mudar status — atribuição de técnico já existe
      via API, ainda não tem campo dedicado nesta tela)
- [x] Gestão de clientes (listar, criar)
- [x] Gestão de usuários e técnicos (mudar papel, ativar/desativar — com
      proteção contra o admin remover o próprio acesso)
- [x] Gestão de cupons
- [x] Gestão de banners
- [x] Configurações da loja
- [x] Logs do sistema (leitura) — instrumentado em `order.created`,
      `order.cancelled` e `service_order.status_changed`; não instrumentei
      o módulo de auth de propósito (mesma decisão da Etapa 6, de não mexer
      nele de novo)

---

## 🟡 Etapa 9 — Pagamentos

**Status:** Concluída no código, **NÃO TESTADA contra a API real do Mercado
Pago** — este ambiente não tem acesso à internet nem suas credenciais.
Antes de ir pra produção, teste com uma credencial de teste (sandbox):
https://www.mercadopago.com.br/developers/pt/docs/checkout-api/testing

### Objetivo
Integração com gateway de pagamento brasileiro.

### Entregáveis

- [x] Integração com Mercado Pago — PIX (QR code direto, sem redirecionamento)
      e cartão/boleto (via Checkout Pro — redireciona para a página hospedada
      do Mercado Pago; assim nunca tocamos em dado de cartão no nosso backend,
      evitando o escopo de compliance PCI-DSS)
- [x] Webhook de confirmação de pagamento (`POST /api/payments/webhook`) —
      sempre confere o pagamento de novo na API do Mercado Pago antes de
      confiar no que veio na notificação, como a documentação deles recomenda
- [x] Atualização automática de status do pedido ao pagar (`pending` → `confirmed`)
- [x] Emissão de registro de pagamento em `payment_history`
- [x] Reembolso (admin, na tela de Pedidos)

**Variáveis de ambiente novas** (`.env.example` já atualizado):
`FRONTEND_URL`, `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`.
Sem `MERCADOPAGO_ACCESS_TOKEN` configurado, o checkout de pagamento retorna
um erro claro em vez de travar o servidor inteiro (a variável é opcional na
validação de ambiente de propósito).

---

## 🟡 Etapa 10 — Garantias e pós-venda

**Status:** Concluída no código, **e-mail via Resend NÃO TESTADO** contra a
API real (mesma limitação do Mercado Pago — sem internet neste ambiente).

### Entregáveis

- [x] Registro de garantia ao fechar OS ou pedido — automático: ao marcar
      uma OS como "delivered" (garantia de serviço, 90 dias) ou um pedido
      como "delivered" (garantia de loja por item físico, 90 dias — mínimo
      do CDC)
- [x] Consulta de garantia pelo cliente (`GET /api/warranties/lookup`,
      pública, sem login) — por IMEI/número de série (via a OS de origem) ou
      CPF/CNPJ (para garantias de produto, que não têm série individual
      rastreada neste sistema)
- [x] Acionamento de garantia — o schema não tem uma tabela dedicada de
      "chamados de garantia", então isso valida que a garantia ainda está no
      prazo e registra o acionamento como log de auditoria; o técnico abre a
      OS de atendimento normalmente depois
- [x] E-mail de notificação ao cliente via Resend — enviado quando a
      garantia é criada. Sem `RESEND_API_KEY` configurado, o sistema **não
      trava**: só loga um aviso e segue (notificação por e-mail nunca deve
      derrubar o fluxo principal)

**Bug real que encontrei e corrigi nesta etapa**: o nível de log usado desde
a Etapa 8 (`'warn'`) não batia com o enum real do banco
(`'debug'|'info'|'warning'|'error'|'critical'`) — corrigido em
`lib/logger.ts`, `services/logs.service.ts`, `routes/logs.ts` e no frontend.
Esse tipo de erro só aparece rodando de verdade contra o Postgres, por isso
não tinha sido pego antes — reforça a importância de você rodar
`pnpm test` e testar manualmente assim que possível.

---

## 🟡 Etapa 11 — Deploy e CI/CD

**Status:** Configuração pronta no código; a publicação de verdade depende
das suas próprias contas (Cloudflare, Railway, GitHub) — isso eu não
consigo fazer por você.

### Entregáveis

- [x] Configurar deploy do frontend no Cloudflare Pages — workflow pronto
      (`.github/workflows/deploy.yml`), falta só você criar os secrets
- [x] Configurar deploy do backend no Railway — `railway.json` na raiz do
      projeto, com o build/start corrigidos para o monorepo (a instrução
      original desta etapa, escrita lá na Etapa 1, tinha um erro: mandava
      apontar o Root Directory para `backend/`, o que quebra a resolução do
      pacote `shared` — corrigido)
- [x] Configurar banco PostgreSQL em produção — você já tem isso no Neon
- [ ] Configurar Cloudflare R2 — **não implementado** (mesma decisão da
      Etapa 8: upload de imagem por enquanto é só por URL)
- [x] GitHub Actions: typecheck + build em todo PR (`ci.yml`)
- [x] GitHub Actions: deploy automático ao mesclar na `main` (`deploy.yml`, frontend)
- [x] Variáveis de ambiente de produção documentadas (tabela no fim deste
      arquivo, atualizada com as vars de pagamento/e-mail que faltavam)
- [x] HTTPS com certificado automático — automático tanto no Cloudflare
      Pages quanto no Railway, nada a configurar
- [x] Health check e reinício automático — `GET /api/health` + até 3
      tentativas de restart, configurado no `railway.json`

**Bug real que encontrei enquanto revisava isso**: o CORS não liberava o
header `X-Session-Id` que o carrinho anônimo usa desde a Etapa 6/7 — isso
bloquearia o carrinho sem login assim que rodasse num navegador de verdade
(neste sandbox nunca testei num navegador real, então passou despercebido
até agora). Corrigido em `backend/src/app.ts`.

---

## 🟡 Etapa 12 — Qualidade e monitoramento

**Status:** Concluída, exceto SDK real do Sentry (ver nota)

### Entregáveis

- [x] Testes unitários para serviços críticos — auth (JWT, tentativas de
      login, hash), estoque (cálculo de delta), pedidos (número sequencial,
      cancelamento), cupons (desconto), OS (máquina de estados), garantias
      (prazos) — construídos incrementalmente ao longo de todas as etapas
- [x] Testes de integração para rotas da API (`src/test/integration.test.ts`,
      via `supertest`) — cobrem health check, 404, validação de
      login/registro, rejeição de rotas protegidas sem token, e CORS. **Não
      cobrem** rotas que precisam consultar o banco de verdade (login válido,
      listagem de produtos, etc.) — este ambiente não tem Postgres
      disponível; essas exigem um banco de teste real
- [x] Rate limiting para rotas públicas — antes só existia nas rotas de auth
      (Etapa 2); agora há um teto geral em toda a API (`backend/src/app.ts`)
- [x] Logging estruturado no backend (`lib/structuredLogger.ts`, JSON em
      stdout/stderr) + `lib/errorReporting.ts` como ponto único de reporte
      de erros não-operacionais
- [ ] Integração com Sentry — **não implementada de verdade**: o ponto de
      extensão está pronto em `lib/errorReporting.ts` (comentado, com o
      passo a passo de como ativar), mas não instalei `@sentry/node` como
      dependência real — é um pacote que eu não teria como testar a
      instalação neste ambiente sem rede, e um SDK mal-testado é pior que
      não ter nada
- [x] Documentação interativa da API — `backend/openapi.yaml` (OpenAPI 3.0),
      servido em `GET /api/docs/openapi.yaml`. Cobre os grupos de recursos
      principais (auth, catálogo, estoque, OS, carrinho/pedidos, garantias,
      pagamentos, administração) — não documenta *cada* endpoint
      administrativo utilitário (ex.: CRUD de fornecedores, defeitos) com o
      mesmo nível de detalhe, mas o padrão se repete e fica claro pelo que
      já está documentado. Para visualizar: cole o conteúdo em
      https://editor.swagger.io ou importe a URL no Postman/Insomnia

---

## Fase Final — Auditoria e módulos de lançamento

Depois da Etapa 12, foi pedida uma auditoria geral do projeto antes da
publicação. Dois bugs reais foram encontrados e corrigidos nesse processo:

- **`perPage` limitado a 100**: o select de produtos na tela de Estoque
  pedia 200 e o backend rejeitava com 400. Corrigido subindo o teto real
  (`lib/pagination.ts`) para 200, em vez de só reduzir o pedido do frontend.
- **`isService` nunca era aplicado em `updateProduct()`**: se um produto
  fosse criado como "serviço" por engano, a tentativa de corrigir isso
  editando o produto nunca era salva de verdade — o produto ficava
  permanentemente sem registro de estoque. Corrigido, e agora o estoque é
  criado retroativamente quando um produto deixa de ser serviço.
- **Blindagem extra em `performMovement()`**: se por qualquer outro motivo
  um produto físico não tiver registro de estoque, uma entrada (`in`) cria
  o registro na hora em vez de travar a operação. Saída/perda continuam
  sendo rejeitadas sem um saldo existente (não há o que subtrair).

### Módulos novos desta fase

- [x] **WhatsApp** — link direto (`wa.me`) com mensagem pré-preenchida:
      botão flutuante em toda a loja, "perguntar sobre este produto" na
      página de produto, e CTA de agendamento na página de Assistência
      Técnica. Não é a API oficial do WhatsApp Business (exigiria conta
      Meta Business verificada) — é a versão que funciona hoje, sem
      nenhuma credencial
- [x] **SEO básico** — title/description/Open Graph dinâmicos por página
      (`useDocumentMeta`, sem `react-helmet`), `robots.txt`, e sitemap.xml
      **dinâmico** gerado a partir dos produtos/categorias ativos no banco
- [x] **Relatórios** — vendas por período (receita, ticket médio, gráfico
      de barras por dia em CSS puro, top produtos) e ordens de serviço por
      período (por status, tempo médio de conclusão)

### Ainda faltando (identificado na auditoria, não implementado)

- [ ] Controle financeiro (contas a pagar/receber, fluxo de caixa)
- [ ] Permissões granulares (hoje são só 3 papéis fixos)
- [ ] Upload de imagem para Cloudflare R2 (Etapa 8) — ainda é só URL
- [ ] Domínio próprio — depende da compra/DNS por conta do usuário

---

## Resumo das etapas

| # | Etapa | Status | Foco |
|---|---|---|---|
| 1 | Estrutura base | ✅ | Monorepo, TypeScript, scaffold |
| 2 | Banco + autenticação | ✅ | Schema, JWT, bcrypt |
| 3 | Catálogo | ✅ | Marcas, categorias, produtos |
| 4 | Estoque | ✅ | Inventário, fornecedores |
| 5 | Ordens de serviço | ✅ (exceto PDF) | Assistência técnica completa |
| 6 | Pedidos e e-commerce | ✅ (exceto frete) | Carrinho, checkout |
| 7 | Frontend cliente | ✅ (exceto toasts) | Loja virtual |
| 8 | Painel admin | ✅ (exceto upload R2) | Back-office |
| 9 | Pagamentos | ✅ código, ⚠️ não testado | Gateway, PIX, cartão |
| 10 | Garantias e pós-venda | ✅ código, ⚠️ e-mail não testado | Pós-venda, notificações |
| 11 | Deploy e CI/CD | ✅ config, falta publicar de verdade | Produção automatizada |
| 12 | Qualidade | ✅ (exceto SDK Sentry) | Testes, monitoring |
| — | Fase final | ✅ (WhatsApp, SEO, relatórios) | Lançamento |
