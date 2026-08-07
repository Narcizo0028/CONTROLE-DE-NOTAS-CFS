# Deploy — GitHub + Render (Next.js CFS 2026)

> **IMPORTANTE:** Este projeto é **Next.js (Node.js)**. No Render, crie um **Web Service** — **NÃO** use **Static Site** e **NÃO** preencha "Publish directory" (`dist`). Esse erro aparece quando o Render está configurado como site estático.

Guia para publicar o **CFS 2026 — Controle de Notas** no GitHub e no Render.

---

## Resumo rápido (Next.js)

| Campo no Render | Valor |
|-----------------|-------|
| Tipo | **Web Service** |
| Runtime | **Node** |
| Build Command | `npm install && npm run build` |
| Start Command | `npm run start:render` |
| Publish Directory | *(deixe vazio)* |
| Node Version | `22.12.0` |

Ou use **Blueprint** com o arquivo `render.yaml` da raiz deste projeto.

---

## 1. Pré-requisitos

- Conta no [GitHub](https://github.com)
- Conta no [Render](https://render.com)
- **Node.js 22+** (SQLite nativo com `--experimental-sqlite`)
- Git instalado localmente

---

## 2. Enviar para o GitHub

No PowerShell, dentro da pasta do projeto:

```powershell
cd "C:\Users\Isaias Narcizo\Desktop\BASE-OFICIAL-RESTRICAO-LAYOUT-MODELO-2026-07-31"

git init
git add .
git commit -m "CFS 2026: sistema de notas com disciplinas oficiais e layout PMMG"

# Crie o repositório vazio no GitHub (ex.: cfs-2026-notas)
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/cfs-2026-notas.git
git push -u origin main
```

### O que NÃO vai para o GitHub (`.gitignore`)

- `node_modules/`
- `.next/`
- `data/*.db` (banco local)
- `.env` / `.env.local` (segredos)

---

## 3. Deploy no Render (Next.js)

### ⚠️ Não reutilize o serviço Python antigo

O serviço `controle-notas-1-pelotao` (Python + `server.py`) é **outro projeto**. Para o Next.js, crie um **serviço novo** ou use Blueprint.

### Opção A — Blueprint (`render.yaml`) — recomendado

1. No Render: **New → Blueprint**
2. Conecte o repositório GitHub
3. O Render detecta o arquivo `render.yaml` na raiz
4. Confirme o deploy

O blueprint já configura:

| Item | Valor |
|------|--------|
| Build | `npm install && npm run build` |
| Start | `npm run start:render` |
| Node | 22.12.0 |
| Disco persistente | `/var/data` (SQLite) |
| Health check | `/api/health` |
| Seed demo | `SEED_DEMO_DATA=true` na 1ª subida |

### Opção B — Web Service manual

1. **New → Web Service** *(não Static Site)*
2. Conecte o repositório GitHub do **Next.js**
3. Configure:

| Campo | Valor |
|-------|--------|
| Runtime | Node |
| Build Command | `npm install && npm run build` |
| Start Command | `npm run start:render` |
| Publish Directory | *(vazio — não use `dist`)* |
| Node Version | `22.12.0` |

4. **Environment Variables:**

| Variável | Valor |
|----------|--------|
| `JWT_SECRET` | *(gere uma chave longa aleatória)* |
| `SEED_DEMO_DATA` | `true` *(primeira implantação; depois pode ser `false`)* |
| `DATABASE_DIR` | `/var/data` |
| `NODE_ENV` | `production` |

5. **Disk** (recomendado — plano pago):
   - Mount Path: `/var/data`
   - Size: 1 GB

> Sem disco persistente, o SQLite é apagado a cada redeploy.

---

## 4. Após o deploy

URL gerada pelo Render, exemplo:

`https://cfs-2026-notas.onrender.com`

### Credenciais de demonstração (se `SEED_DEMO_DATA=true`)

| Perfil | Login | Senha |
|--------|-------|-------|
| Controlador Geral | `admin.geral` | `admin123` |
| Controlador 1º Pelotão | `ctrl.pelotao1` | `pelotao1` |
| Discente | `disc.2026001` | `discente123` |

**Altere as senhas após o primeiro acesso em produção.**

---

## 5. Scripts npm úteis

```bash
npm run dev              # Desenvolvimento local
npm run build            # Build de produção
npm run start:local      # Start local (sem bootstrap)
npm run start:render     # Start produção (bootstrap + next start)
npm run db:seed          # Dados de teste
npm run db:reset         # Apaga e recria o banco local
npm run db:bootstrap     # Schema + disciplinas (+ seed se SEED_DEMO_DATA=true)
```

---

## 6. Variáveis de ambiente

Copie `.env.example` para `.env.local` no desenvolvimento:

```env
JWT_SECRET=sua-chave-secreta
SEED_DEMO_DATA=true
# DATABASE_DIR=./data
```

---

## 7. Estrutura de deploy

```
render.yaml          → Blueprint Render
.env.example         → Modelo de variáveis
scripts/bootstrap-db.ts → Inicialização antes do start
public/images/       → Escudo EFAS (estático)
data/                → SQLite (ignorado no Git; persistente no Render)
```

---

## 8. Solução de problemas

| Problema | Solução |
|----------|---------|
| **`Couldn't find any pages or app directory`** | A pasta `app/` **não está no GitHub**. Abra o repositório no navegador e confirme que `app/` aparece na **raiz**, ao lado de `package.json`. Refaça o `git push` com todos os arquivos (veja seção 2). |
| **`Publish directory dist does not exist`** | Serviço criado como **Static Site**. Apague e crie **Web Service**. |
| Build falha no Render | Confirme Node **22.12.0** (arquivo `.node-version` na raiz) |
| Login não funciona | Verifique `JWT_SECRET` definido |
| Banco vazio após redeploy | Configure disco em `/var/data` |
| Seed não rodou | Defina `SEED_DEMO_DATA=true` e redeploy |
| App lenta no free tier | Render free “dorme” após inatividade — normal |

### Conferir no GitHub (obrigatório antes do deploy)

Na **raiz** do repositório devem aparecer:

```
app/
components/
lib/
public/
package.json
render.yaml
middleware.ts
next.config.js
```

Se só existirem `package.json`, `render.yaml` e `README.md` **sem** a pasta `app/`, o deploy sempre falhará.

### Comando para enviar tudo de uma vez

```powershell
Set-Location "C:\Users\Isaias Narcizo\Desktop\BASE-OFICIAL-RESTRICAO-LAYOUT-MODELO-2026-07-31"

git init
git add app components lib public scripts middleware.ts next.config.js package.json package-lock.json render.yaml tsconfig.json tailwind.config.ts postcss.config.js .gitignore .env.example .node-version DEPLOY.md README.md exemplos types
git status
# Deve listar centenas de arquivos dentro de app/
git commit -m "CFS 2026 Next.js completo com pasta app"
git push -u origin main --force
```

> Use `--force` somente se o repositório remoto tiver arquivos errados/incompletos e você tiver certeza de substituí-lo.

---

Desenvolvido para o **CFS 2026 — PMMG/EFAS**.
