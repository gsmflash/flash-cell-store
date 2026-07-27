# Deploy — Flash Cell Store

## Frontend → Cloudflare Pages

### Build
```bash
pnpm --filter @flash-cell/frontend run build
# Saída: frontend/dist/
```

### Configuração no painel Cloudflare Pages
| Campo | Valor |
|---|---|
| Build command | `pnpm --filter @flash-cell/frontend run build` |
| Build output directory | `frontend/dist` |
| Root directory | `/` |
| Node.js version | `20` |

### Variáveis de ambiente (Cloudflare Pages)
```
VITE_API_URL = https://api.flashcellstore.com
```

### Roteamento SPA
Crie `frontend/public/_redirects`:
```
/*  /index.html  200
```

---

## Backend → Railway (recomendado)

### Configuração Railway
1. Conecte o repositório GitHub
2. Selecione a pasta `backend/` como root (ou use Nixpacks com `rootDirectory = backend`)
3. Configure as variáveis de ambiente

### Variáveis de ambiente (Railway)
```
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://...
CORS_ORIGIN=https://flashcellstore.pages.dev
```

### Comando de start
```bash
pnpm --filter @flash-cell/backend run build && pnpm --filter @flash-cell/backend run start
```

---

## Backend → Render (alternativa)

### Configuração Render
| Campo | Valor |
|---|---|
| Build Command | `pnpm install && pnpm --filter @flash-cell/backend run build` |
| Start Command | `pnpm --filter @flash-cell/backend run start` |
| Node Version | 20 |

---

## Banco de dados

### Aplicar migrations em produção
```bash
# Configure DATABASE_URL no .env antes de rodar
DATABASE_URL=postgresql://... pnpm db:migrate
```

### Cloudflare R2
1. Crie um bucket no painel Cloudflare
2. Gere as credenciais de API
3. Configure as variáveis `R2_*` no backend
