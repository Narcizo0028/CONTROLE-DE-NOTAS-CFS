# Bugs recorrentes — CFS 2026 Notas

## Deploy / GitHub (mais comuns)

| # | Erro | Causa | Solução |
|---|------|-------|---------|
| 1 | `Cannot find module scripts/check-structure.mjs` | Arquivos enviados **soltos na raiz** do GitHub, sem pastas | Substituir repo pelo ZIP **v1.0.2** com estrutura correta |
| 2 | `Couldn't find any app directory` | Pasta `app/` **não existe** no GitHub | Enviar pasta `app/` completa na raiz |
| 3 | `Publish directory dist does not exist` | Render configurado como **Static Site** | Usar **Web Service** Node |
| 4 | Node 20 em vez de 22 | `NODE_VERSION` ausente | Definir `22.12.0` no Render |
| 5 | Arquivos `page (25).tsx`, `route (10).ts` na raiz | Upload manual arquivo por arquivo no GitHub | **Nunca** fazer upload solto; use ZIP ou `git push` |

## Estrutura correta vs errada

### CORRETO (GitHub)
```
app/
components/
lib/
public/
scripts/
package.json
render.yaml
middleware.ts
```

### ERRADO (seu repo atual)
```
AppLayout.tsx      ← deveria estar em components/
auth.ts            ← deveria estar em lib/
page (25).tsx      ← deveria estar em app/.../page.tsx
check-structure.mjs ← na raiz, package.json procura em scripts/
(sem pasta app/)
```

## Segurança (corrigidos na v1.0.2)

- IDOR em relatórios e ranking
- Nomes de discentes expostos na API
- Sessão válida após desativar usuário
- Brute force no login (5 tentativas / 15 min)
- Dois Controladores Gerais via edição

## Pendente

- Restauração de backup incompleta (colunas antigas)

## Como validar antes do deploy

```powershell
npm run verify
npm run build
```

Ou use o ZIP: `CFS-2026-NOTAS-RENDER-v1.0.2.zip`
