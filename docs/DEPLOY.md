# Deploy em Produção — Flash Cell Store

Este documento descreve como publicar o sistema completo em produção usando:

- **Frontend:** Cloudflare Pages (CDN global, gratuito)
- **Backend:** Railway (ou Render como alternativa)
- **Banco de dados:** Railway PostgreSQL (ou Neon.tech como alternativa)
- **Armazenamento de arquivos:** Cloudflare R2

---

## Visão geral da arquitetura de produção

```
Usuário
  │
  ▼
Cloudflare Pages (frontend estático)
  https://flashcell.pages.dev
  │
  │  HTTPS
  ▼
Railway (backend Node.js)
  https://flash-cell-api.up.railway.app
  │
  ▼
Railway PostgreSQL
  postgresql://...
```

---

## 1. Banco de dados — Railway PostgreSQL

### Criando o banco

1. Acesse [railway.app](https://railway.app) e faça login
2. Crie um novo projeto: **New Project → Provision PostgreSQL**
3. Clique no serviço PostgreSQL criado
4. Acesse **Variables** e copie `DATABASE_URL`

```
postgresql://postgres:<senha>@<host>.railway.app:5432/railway
```

### Aplicando as migrations

Com a `DATABASE_URL` copiada:

```bash
cd flash-cell-store

# Aplica todas as migrations
DATABASE_URL="postgresql://..." pnpm db:migrate

# Cria o usuário admin
DATABASE_URL="postgresql://..." pnpm --filter @flash-cell/backend run db:seed
```

> ⚠️ Altere a senha do admin (`admin@flashcell.com / Admin@12345`) após o primeiro deploy.

### Alternativa: Neon.tech

[Neon.tech](https://neon.tech) oferece PostgreSQL serverless com plano gratuito.

1. Crie uma conta em neon.tech
2. Crie um projeto e um banco de dados
3. Copie a connection string em **Dashboard → Connection Details**
4. Use a string como `DATABASE_URL`

---

## 2. Backend — Railway

### Preparando o build

Este é um monorepo pnpm, então o Railway precisa rodar o build a partir da
**raiz do projeto** (não de dentro de `backend/` isoladamente) para o
workspace ser resolvido corretamente.

Já existe um `railway.json` na raiz do projeto com o build/start corretos
para esse cenário — o Railway detecta e usa esse arquivo automaticamente.

> Nota: o pacote `shared/` do monorepo existe na estrutura, mas não é
> importado por nenhum código do backend nem do frontend hoje — então ele
> não faz parte do pipeline de build. Se um dia vocês passarem a
> compartilhar tipos/validações reais entre frontend e backend por ali, aí
> sim vale adicionar um script de build e reincluir no `railway.json`.

### Deploy no Railway

**Opção A: GitHub integration (recomendada)**

1. Faça push do projeto para um repositório GitHub
2. Em Railway: **New Project → Deploy from GitHub repo**
3. Selecione o repositório
4. Configure o serviço:
   - **Root directory:** `/` (raiz do monorepo — **não** `backend`)
   - Build/start command: deixe em branco — o `railway.json` da raiz já
     define `pnpm install --frozen-lockfile && pnpm --filter
     @flash-cell/backend run build` e `pnpm --filter @flash-cell/backend run start`
5. Em **Settings → Networking**, confirme que a porta exposta bate com a
   variável `PORT` que você configurar (padrão `3001`)

**Opção B: Railway CLI**

```bash
npm install -g @railway/cli
railway login
cd flash-cell-store
railway init
railway up
```

### Health check e restart automático

O `railway.json` já configura:
- **Health check:** `GET /api/health` — o Railway só considera o deploy
  saudável depois que esse endpoint responder
- **Restart automático:** até 3 tentativas em caso de falha (`ON_FAILURE`)

### Variáveis de ambiente no Railway

No painel do serviço backend, acesse **Variables** e adicione:

```
DATABASE_URL=postgresql://... (da etapa anterior)
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://flashcell.pages.dev
FRONTEND_URL=https://flashcell.pages.dev
JWT_ACCESS_SECRET=<string aleatória de 64+ caracteres, diferente da de refresh>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<string aleatória de 64+ caracteres, diferente da de access>
JWT_REFRESH_EXPIRES_IN=30d

# Pagamentos (Etapa 9) — opcional até você ativar Mercado Pago de verdade
MERCADOPAGO_ACCESS_TOKEN=<credencial de produção do Mercado Pago>
MERCADOPAGO_WEBHOOK_SECRET=<se for validar assinatura do webhook>

# E-mail transacional (Etapa 10) — opcional até você ativar o Resend
RESEND_API_KEY=<sua chave do Resend>
EMAIL_FROM=Flash Cell Store <naoresponda@seudominio.com.br>
```

> **Importante sobre Mercado Pago e Resend:** essas integrações foram
> construídas e revisadas neste projeto, mas **nunca foram testadas contra
> as APIs reais** (o ambiente onde isso foi desenvolvido não tinha acesso à
> internet). Antes de aceitar pagamentos ou enviar e-mails de verdade, teste
> com uma credencial de sandbox do Mercado Pago e uma chave de teste do
> Resend. Sem essas variáveis configuradas, o sistema não trava — só avisa
> no log e segue (pagamento retorna erro claro ao cliente; e-mail é só
> pulado silenciosamente).

> **Gerando um segredo seguro (rode duas vezes, um para cada variável):**
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

### Obtendo a URL do backend

Após o deploy, Railway fornece uma URL pública:
```
https://flash-cell-api.up.railway.app
```

Anote esta URL — será necessária para configurar o frontend.

---

## 3. Frontend — Cloudflare Pages

### Preparando o build

O frontend usa `VITE_API_URL` para saber onde está a API em produção.

Verifique o `frontend/.env.example`:
```env
VITE_API_URL=https://flash-cell-api.up.railway.app/api
```

### Deploy no Cloudflare Pages

**Via GitHub integration (recomendada):**

1. Acesse [pages.cloudflare.com](https://pages.cloudflare.com)
2. **Create a project → Connect to Git**
3. Selecione o repositório
4. Configure o build:
   - **Framework preset:** Vite
   - **Root directory:** `/` (raiz do monorepo — **não** `frontend`, pelo
     mesmo motivo do Railway: o `pnpm install` precisa rodar a partir da
     raiz para resolver o workspace corretamente)
   - **Build command:** `pnpm install && pnpm --filter @flash-cell/frontend run build`
   - **Build output directory:** `frontend/dist`

5. Em **Environment variables**, adicione:
   ```
   VITE_API_URL=https://flash-cell-api.up.railway.app/api
   ```
   (repare no `/api` no final — é o prefixo que todas as rotas do backend usam)

6. Clique em **Save and Deploy**

**Via Wrangler CLI:**

```bash
npm install -g wrangler
cd flash-cell-store

# Build (roda a partir da raiz do monorepo)
VITE_API_URL=https://flash-cell-api.up.railway.app/api pnpm --filter @flash-cell/frontend run build

# Deploy
cd frontend
wrangler pages deploy dist --project-name=flash-cell-store
```

### SPA Routing

O jeito "clássico" de fazer isso (`/* /index.html 200` no `_redirects`) **não
funciona no Cloudflare Pages** — o validador deles rejeita essa regra
específica como "infinite loop detected" (confirmado em deploy real; a
regra é simplesmente ignorada, sem quebrar o build, mas sem fazer efeito).

A solução usada aqui: o build do frontend gera um `dist/404.html` idêntico
ao `dist/index.html` (veja o script `build` em `frontend/package.json`). O
Cloudflare Pages serve automaticamente `404.html` pra qualquer rota que não
bate com um arquivo real — como esse HTML é o mesmo app React, o React
Router assume a partir daí no navegador e mostra a rota certa. Não precisa
de nenhuma configuração extra no painel do Cloudflare para isso funcionar.

---

## 4. Cloudflare R2 — Armazenamento de arquivos

> ⚠️ Esta etapa será necessária a partir da Etapa 3 (upload de imagens de produtos).

### Criando o bucket R2

1. No painel do Cloudflare, acesse **R2 → Create bucket**
2. Nomeie o bucket: `flash-cell-store`
3. Crie um token de API: **R2 → Manage R2 API Tokens → Create API Token**
   - Permissões: `Object Read & Write`
   - Escopo: `Specific bucket - flash-cell-store`

4. Anote:
   - `Account ID` (visível no dashboard)
   - `Access Key ID`
   - `Secret Access Key`
   - `Endpoint`: `https://<account-id>.r2.cloudflarestorage.com`

### Configurando CORS no bucket R2

No bucket criado, em **Settings → CORS Policy**:

```json
[
  {
    "AllowedOrigins": ["https://flashcell.pages.dev"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

### Variáveis de ambiente do backend (R2)

Adicione no Railway:
```
R2_ACCOUNT_ID=<seu account id>
R2_ACCESS_KEY_ID=<access key>
R2_SECRET_ACCESS_KEY=<secret key>
R2_BUCKET_NAME=flash-cell-store
R2_PUBLIC_URL=https://pub-<hash>.r2.dev
```

> O `R2_PUBLIC_URL` é gerado ao habilitar o acesso público no bucket R2.

---

## 5. Domínio personalizado (opcional)

### Frontend

No Cloudflare Pages:
1. **Custom domains → Set up a custom domain**
2. Adicione `www.flashcell.com.br`
3. Configure o DNS conforme indicado

### Backend

No Railway:
1. Serviço backend → **Settings → Networking → Custom Domain**
2. Adicione `api.flashcell.com.br`
3. Configure o DNS:
   ```
   CNAME  api  <hash>.up.railway.app
   ```

Atualize `CORS_ORIGIN` no Railway:
```
CORS_ORIGIN=https://www.flashcell.com.br
```

---

## 6. Checklist pré-go-live

- [ ] `DATABASE_URL` configurada e migrations aplicadas
- [ ] Seed do banco executado (admin criado)
- [ ] Senha do admin alterada
- [ ] `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` com 64+ caracteres aleatórios cada, e DIFERENTES entre si
- [ ] `CORS_ORIGIN` aponta para o domínio correto do frontend
- [ ] `VITE_API_URL` aponta para a URL correta do backend
- [ ] Frontend faz build sem erros
- [ ] Backend inicia sem erros e responde `/api/health`
- [ ] Login com admin funciona em produção
- [ ] SPA routing funciona (acessar URL direta não retorna 404)
- [ ] HTTPS ativo nos dois serviços

---

## 7. Alternativa: Render.com

Caso prefira o Render ao Railway:

**Backend no Render:**
1. **New → Web Service**
2. Conecte o repositório GitHub
3. Configure:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Environment:** Node

**Banco no Render:**
1. **New → PostgreSQL**
2. Copie a `Internal Database URL` (mais rápida dentro do Render)

---

## 8. Monitoramento básico

### Health check automático

Configure no Railway/Render:
- **Health check path:** `/api/health`
- **Interval:** 30 segundos

O serviço será reiniciado automaticamente se o health check falhar.

### Logs

- **Railway:** painel do serviço → **Logs**
- **Render:** painel do serviço → **Logs**
- **Cloudflare Pages:** Analytics → Real-time logs

---

## 9. CI/CD — GitHub Actions

Dois workflows já estão prontos em `.github/workflows/`:

### `ci.yml` — roda em todo PR e push na `main`
Instala dependências, roda `pnpm typecheck` (as três packages), roda os
testes do backend (`pnpm --filter @flash-cell/backend run test`) e o
`pnpm build`. Não precisa de nenhum secret — é só validação.

### `deploy.yml` — roda em todo push na `main`
Builda e publica o frontend no Cloudflare Pages automaticamente. Precisa
destes secrets configurados em **Settings → Secrets and variables → Actions**
do repositório no GitHub:

| Secret | Onde conseguir |
|---|---|
| `CLOUDFLARE_API_TOKEN` | [Cloudflare Dashboard → My Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens) — crie um token com permissão "Cloudflare Pages: Edit" |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard → barra lateral direita, em qualquer domínio |
| `VITE_API_URL_PRODUCTION` | A URL do seu backend no Railway, ex. `https://flash-cell-api.up.railway.app/api` |

O backend no Railway normalmente já faz deploy automático a cada push na
`main` assim que você conecta o repositório pelo painel deles — **não**
precisa de um step de GitHub Actions separado para isso.

**Sem acesso à internet neste ambiente de desenvolvimento, não consegui
testar esses workflows rodando de verdade** — a sintaxe segue a
documentação oficial das actions usadas (`actions/checkout`,
`pnpm/action-setup`, `cloudflare/pages-action`), mas vale rodar o primeiro
PR/push com atenção para confirmar que passa.

---

## Resumo das variáveis de ambiente por serviço

### Backend (Railway/Render)

| Variável | Exemplo | Obrigatória |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host/db` | ✅ |
| `PORT` | `3001` | ✅ |
| `NODE_ENV` | `production` | ✅ |
| `CORS_ORIGIN` | `https://flashcell.pages.dev` | ✅ |
| `FRONTEND_URL` | `https://flashcell.pages.dev` | ✅ |
| `JWT_ACCESS_SECRET` | `<64+ chars random>` | ✅ |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | ✅ |
| `JWT_REFRESH_SECRET` | `<64+ chars random, diferente do access>` | ✅ |
| `JWT_REFRESH_EXPIRES_IN` | `30d` | ✅ |
| `MERCADOPAGO_ACCESS_TOKEN` | `APP_USR-...` | Só se for vender online (Etapa 9) |
| `MERCADOPAGO_WEBHOOK_SECRET` | `...` | Opcional |
| `RESEND_API_KEY` | `re_...` | Só se quiser e-mail de garantia (Etapa 10) |
| `EMAIL_FROM` | `Flash Cell Store <naoresponda@seudominio.com.br>` | Opcional |
| `R2_ACCOUNT_ID` | `abc123` | Ainda não implementado (ver TODO.md) |
| `R2_ACCESS_KEY_ID` | `...` | Ainda não implementado |
| `R2_SECRET_ACCESS_KEY` | `...` | Ainda não implementado |
| `R2_BUCKET_NAME` | `flash-cell-store` | Ainda não implementado |
| `R2_PUBLIC_URL` | `https://pub-xxx.r2.dev` | Ainda não implementado |

### Frontend (Cloudflare Pages)

| Variável | Exemplo | Obrigatória |
|---|---|---|
| `VITE_API_URL` | `https://flash-cell-api.up.railway.app/api` | ✅ |
