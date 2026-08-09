# CORREÇÃO URGENTE — Login no Render

Se `/api/health` mostra `"users": 0` e `"seedDemo": false`, o serviço foi criado **sem as variáveis de ambiente**.

## Opção A — Redeploy do commit mais recente (recomendado)

O código v1.0.7+ detecta Render automaticamente e cria usuários demo mesmo sem configurar variáveis.

1. Render → seu serviço → **Manual Deploy** → latest commit
2. Aguarde ficar **Live**
3. Acesse: `https://SEU-SITE.onrender.com/api/health`
   - Deve mostrar `"users" > 0` e `"seedDemo": true`
4. Login: `admin.geral` / `admin123`

## Opção B — Configurar variáveis manualmente no painel

**Settings → Environment → Add:**

| Variável | Valor |
|----------|--------|
| `SEED_DEMO_DATA` | `true` |
| `DATABASE_DIR` | `/var/data` |
| `NODE_OPTIONS` | `--experimental-sqlite` |
| `JWT_SECRET` | *(gere uma chave longa)* |

**Settings → Disks → Add disk:**
- Mount path: `/var/data`
- Size: 1 GB

Salve e faça **Manual Deploy**.

## Verificação

```
GET /api/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "users": 96,
  "seedDemo": true,
  "adminReady": true,
  "databaseDir": "/var/data"
}
```

## Credenciais demo

| Login | Senha |
|-------|-------|
| admin.geral | admin123 |
| ctrl.pelotao1 | pelotao1 |
| disc.2026001 | discente123 |
