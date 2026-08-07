# Deploy na Vercel — CFS 2026 Notas v1.0.4

Guia para publicar o sistema na **Vercel** (Next.js + API Routes + SQLite).

---

## Importante — Vercel vs Render

| Item | Vercel | Render (recomendado p/ produção) |
|------|--------|----------------------------------|
| Tipo | Serverless | Servidor contínuo |
| SQLite persistente | **Não** (usa `/tmp`, dados podem sumir) | **Sim** (disco `/var/data`) |
| Uso ideal | Demo / testes / preview | Produção com notas reais |

Com `SEED_DEMO_DATA=true`, o sistema recria usuários de demonstração quando necessário.

---

## Passo 1 — Repositório GitHub

https://github.com/Narcizo0028/CONTROLE-DE-NOTAS-CFS

---

## Passo 2 — Criar projeto na Vercel

1. Acesse [vercel.com/new](https://vercel.com/new)
2. **Import Git Repository** → conecte o GitHub
3. Selecione `CONTROLE-DE-NOTAS-CFS`
4. A Vercel detecta Next.js automaticamente (`vercel.json` incluído)

### Configuração detectada

| Campo | Valor |
|-------|--------|
| Framework | Next.js |
| Build Command | `npm run build` |
| Node | 22.x (via `package.json` engines) |
| Região | `gru1` (São Paulo) |

5. Antes de deploy, configure as variáveis abaixo
6. Clique **Deploy**

---

## Passo 3 — Variáveis de ambiente

**Project Settings → Environment Variables** (Production, Preview e Development):

| Variável | Valor |
|----------|--------|
| `JWT_SECRET` | chave longa aleatória *(obrigatório)* |
| `SEED_DEMO_DATA` | `true` |
| `NODE_OPTIONS` | `--experimental-sqlite` |

Opcional:

| Variável | Valor |
|----------|--------|
| `DATABASE_DIR` | `/tmp/cfs2026-data` *(padrão automático na Vercel)* |

---

## Passo 4 — Acessar

Após o deploy, acesse uma vez para inicializar o banco:

```
https://seu-projeto.vercel.app/api/health
```

Depois faça login em `/login`:

| Perfil | Login | Senha |
|--------|-------|-------|
| Controlador Geral | `admin.geral` | `admin123` |
| Controlador 1º Pelotão | `ctrl.pelotao1` | `pelotao1` |
| Discente | `disc.2026001` | `discente123` |

---

## Deploy via CLI

```bash
npm install -g vercel
vercel login
vercel link
vercel env add JWT_SECRET
vercel env add SEED_DEMO_DATA
vercel env add NODE_OPTIONS
vercel --prod
```

---

## Erros comuns

| Problema | Solução |
|----------|---------|
| Build falha “app directory” | Repositório sem pasta `app/` |
| Login não funciona | Defina `JWT_SECRET` na Vercel |
| Erro SQLite / experimental | Confirme `NODE_OPTIONS=--experimental-sqlite` |
| Dados sumiram após deploy | Normal — SQLite em `/tmp` não é persistente |

---

## Produção com dados permanentes

Use **Render** com disco persistente — consulte `DEPLOY.md` ou `PUBLICAR-RENDER.md`.
