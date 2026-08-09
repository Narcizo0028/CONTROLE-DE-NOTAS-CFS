# Publicar no Render — CFS 2026 Notas v1.0.1

Pacote **Next.js** pronto para GitHub + Render.

---

## Checklist rápido

| Item | Status |
|------|--------|
| Tipo no Render | **Web Service** (não Static Site) |
| Publish Directory | **vazio** |
| Node | **22.12.0** |
| Pasta `app/` na raiz do GitHub | **obrigatório** |
| `JWT_SECRET` | gerado pelo `render.yaml` |
| Disco persistente | `/var/data` |

---

## Passo 1 — GitHub

### Opção A — ZIP (sem Git instalado)

```powershell
Set-Location "C:\Users\Isaias Narcizo\Desktop\BASE-OFICIAL-RESTRICAO-LAYOUT-MODELO-2026-07-31"
.\scripts\criar-pacote-render.ps1
```

O ZIP será criado na Área de Trabalho: **`CFS-2026-NOTAS-RENDER-v1.0.1.zip`**

1. Extraia o ZIP
2. No GitHub, crie repositório vazio
3. **Upload files** → arraste **todos** os arquivos extraídos para a **raiz**
4. Confirme que `app/` aparece ao lado de `package.json`

### Opção B — Git

```powershell
Set-Location "C:\Users\Isaias Narcizo\Desktop\BASE-OFICIAL-RESTRICAO-LAYOUT-MODELO-2026-07-31"

git init
git add .
git commit -m "CFS 2026 Notas v1.0.1 - Render"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/cfs-2026-notas.git
git push -u origin main
```

---

## Passo 2 — Render

### Blueprint (recomendado)

1. [render.com](https://render.com) → **New → Blueprint**
2. Conecte o repositório
3. Confirme o `render.yaml`
4. Deploy

### Manual (se preferir)

| Campo | Valor |
|-------|--------|
| Type | Web Service |
| Runtime | Node |
| Build | `npm install && npm run build` |
| Start | `npm run start:render` |
| Node | 22.12.0 |
| Disk mount | `/var/data` (1 GB) |

---

## Passo 3 — Acessar

```
https://SEU-SERVICO.onrender.com/login
```

| Perfil | Login | Senha |
|--------|-------|-------|
| Controlador Geral | `admin.geral` | `admin123` |
| Controlador 1º Pelotão | `ctrl.pelotao1` | `pelotao1` |
| Discente | `disc.2026001` | `discente123` |

> Com `SEED_DEMO_DATA=true` (padrão no blueprint). Altere senhas após o primeiro acesso.

---

## Erros comuns

| Erro | Solução |
|------|---------|
| `Publish directory dist does not exist` | Criou Static Site — use **Web Service** |
| `Couldn't find app directory` | GitHub sem pasta `app/` — reenvie o pacote completo |
| Node 20 no build | Defina `NODE_VERSION=22.12.0` |

---

## Conteúdo desta versão (v1.0.1)

- 30 disciplinas oficiais CFS 2026
- 3 perfis (Geral, Pelotão, Discente)
- Importação JSON de discentes e notas
- Ranking com censura para discentes
- Layout PMMG/EFAS
- Correções de segurança (IDOR, sessão, login)
- Bootstrap automático no Render
