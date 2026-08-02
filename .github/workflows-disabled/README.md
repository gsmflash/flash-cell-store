# Workflows desativados temporariamente

Esses dois arquivos (`ci.yml` e `deploy.yml`) foram movidos pra fora de
`.github/workflows/` de propósito, durante a fase de estabilização do deploy
manual (Railway + Cloudflare Pages pelos painéis).

Motivo: eles exigem secrets do GitHub (`CLOUDFLARE_API_TOKEN`,
`CLOUDFLARE_ACCOUNT_ID`, `VITE_API_URL_PRODUCTION`) que nunca foram
configurados, então ficavam falhando em todo push — o que só gerava
confusão enquanto ainda estávamos resolvendo problemas de build reais.

## Como reativar (quando o deploy manual já estiver 100% estável)

1. Configure os secrets em GitHub → Settings → Secrets and variables → Actions
   (veja `docs/DEPLOY.md`, seção "CI/CD — GitHub Actions", pra saber onde
   pegar cada um)
2. Mova os dois arquivos de volta:
   ```bash
   mv .github/workflows-disabled/*.yml .github/workflows/
   rmdir .github/workflows-disabled
   ```
3. Commit e push — a partir daí, todo push vai rodar o CI automaticamente,
   e todo push na `main` vai disparar o deploy automático do frontend.
