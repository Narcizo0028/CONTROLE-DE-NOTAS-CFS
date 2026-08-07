# CFS 2026 — Sistema de Controle Geral de Notas

Sistema web completo para controle de notas do **Curso de Formação de Sargentos — CFS 2026**.

---

## 1. Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                    │
│  React 18 + Tailwind CSS + App Router + Client Components│
├─────────────────────────────────────────────────────────┤
│                   API ROUTES (Next.js)                   │
│  REST endpoints com validação, permissões e auditoria    │
├─────────────────────────────────────────────────────────┤
│                   CAMADA DE NEGÓCIO                      │
│  auth · permissions · ranking · audit · pdf-export       │
├─────────────────────────────────────────────────────────┤
│                   BANCO DE DADOS                         │
│  SQLite (node:sqlite) — persistência em disco            │
└─────────────────────────────────────────────────────────┘
```

**Padrão:** Monolito full-stack com Next.js 14 App Router. Toda a lógica de backend roda via API Routes server-side. O banco SQLite é armazenado em `data/cfs2026.db`.

---

## 2. Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript |
| Frontend | React 18, Tailwind CSS |
| Banco de Dados | SQLite (`node:sqlite`, Node 22+) |
| Autenticação | JWT (jose) + bcryptjs |
| Validação | Zod |
| PDF | jsPDF + jspdf-autotable |
| Ícones | Lucide React |
| Datas | date-fns |

---

## 3. Estrutura do Banco de Dados

| Tabela | Descrição |
|--------|-----------|
| `pelotoes` | 8 pelotões do CFS 2026 |
| `users` | Usuários (Controlador Geral, Controladores de Pelotão, Discentes) |
| `discentes` | Cadastro de discentes vinculados a pelotões |
| `disciplinas` | Disciplinas com pontos distribuídos |
| `notas` | Notas lançadas (unique: discente + disciplina) |
| `autorizacoes_discente` | Autorização/bloqueio de lançamento por discente |
| `audit_log` | Histórico completo de auditoria (imutável) |
| `login_attempts` | Registro de tentativas de login |
| `backups` | Histórico de backups e restaurações |

---

## 4. Regras de Acesso por Perfil

### Controlador Geral (1 usuário)
- Acesso total a todos os dados e funções
- Gerencia disciplinas, usuários, pelotões
- Ranking geral e comparativo entre pelotões
- Relatórios administrativos e auditoria completa
- Backup e restauração

### Controlador de Pelotão (8 usuários, 1 por pelotão)
- Acesso restrito ao próprio pelotão
- Cadastro e edição de discentes
- Lançamento individual e coletivo de notas
- Importação JSON assistida
- Autorização/bloqueio de lançamento pelos discentes
- Ranking e relatórios do pelotão
- Auditoria do pelotão

### Discente
- Acesso apenas às próprias informações
- Visualização de notas e aproveitamento
- Ranking censurado (geral e pelotão)
- Lançamento em disciplinas autorizadas
- Alteração de senha

---

## 5. Páginas e Componentes

### Páginas
| Rota | Perfil | Descrição |
|------|--------|-----------|
| `/login` | Público | Autenticação |
| `/dashboard/geral` | Controlador Geral | Painel administrativo |
| `/dashboard/pelotao` | Controlador Pelotão | Painel do pelotão |
| `/dashboard/discente` | Discente | Painel pessoal |
| `/disciplinas` | Controlador Geral | CRUD de disciplinas |
| `/usuarios` | Controlador Geral | Gerenciamento de usuários |
| `/discentes` | Geral / Pelotão | Cadastro de discentes |
| `/notas` | Geral / Pelotão | Lançamento de notas |
| `/importacao` | Controlador Pelotão | Importação JSON |
| `/autorizacoes` | Controlador Pelotão | Autorizações de lançamento |
| `/ranking` | Todos | Ranking com censura para discentes |
| `/relatorios` | Geral / Pelotão | Relatórios com exportação PDF |
| `/auditoria` | Geral / Pelotão | Histórico de alterações |
| `/backup` | Controlador Geral | Backup e restauração |
| `/minhas-notas` | Discente | Notas e lançamento |
| `/alterar-senha` | Todos | Redefinição de senha |

### Componentes
- `AuthProvider` — Contexto de autenticação
- `Sidebar` — Menu lateral responsivo
- `AppLayout` — Layout principal com sidebar
- `DataTable` — Tabela com pesquisa, ordenação e paginação
- `Modal` — Diálogos modais
- `StatCard` — Cards de estatísticas

---

## 6. Arquivos do Projeto

```
├── app/
│   ├── api/                    # API Routes
│   │   ├── auth/               # Login, logout, alterar senha
│   │   ├── discentes/          # CRUD discentes
│   │   ├── disciplinas/        # CRUD disciplinas
│   │   ├── notas/              # Lançamento e correção
│   │   ├── ranking/            # Cálculo de ranking
│   │   ├── usuarios/           # Gerenciamento de usuários
│   │   ├── autorizacoes/       # Autorizações discente
│   │   ├── importacao/         # Importação JSON
│   │   ├── auditoria/          # Logs de auditoria
│   │   ├── backup/             # Backup/restauração
│   │   ├── dashboard/          # Dados dos painéis
│   │   └── relatorios/         # Relatórios
│   ├── dashboard/              # Painéis por perfil
│   ├── login/                  # Página de login
│   └── [demais páginas]/       # Páginas funcionais
├── components/                 # Componentes React
├── lib/                        # Lógica de negócio
│   ├── db.ts                   # Conexão SQLite
│   ├── auth.ts                 # Autenticação JWT
│   ├── permissions.ts          # Controle de acesso
│   ├── ranking.ts              # Cálculo de ranking
│   ├── audit.ts                # Auditoria
│   ├── pdf-export.ts           # Exportação PDF
│   └── types.ts                # Tipos TypeScript
├── scripts/
│   └── seed.ts                 # Dados fictícios de teste
├── data/                       # Banco SQLite (gerado)
└── middleware.ts               # Proteção de rotas
```

---

## 7. Instalação e Execução

### Pré-requisitos
- Node.js **22+** (SQLite nativo com `--experimental-sqlite`)
- npm

### Instalação

```bash
# Clonar/acessar o projeto
cd cfs-2026-notas

# Copiar variáveis de ambiente
cp .env.example .env.local   # Windows: copy .env.example .env.local

# Instalar dependências
npm install

# Popular banco com dados de teste
npm run db:seed

# Iniciar em desenvolvimento
npm run dev
```

Acesse: **http://localhost:3000** (ou 3001 se a porta estiver ocupada)

### Credenciais de Teste

| Perfil | Login | Senha |
|--------|-------|-------|
| Controlador Geral | `admin.geral` | `admin123` |
| Controlador 1º Pelotão | `ctrl.pelotao1` | `pelotao1` |
| Controlador 2º Pelotão | `ctrl.pelotao2` | `pelotao2` |
| Discente | `disc.2026001` | `discente123` |

### Produção local

```bash
npm run build
npm run start:local
```

### Deploy (GitHub + Render)

Consulte **[DEPLOY.md](./DEPLOY.md)** para o passo a passo completo (GitHub, Render Blueprint, disco persistente e variáveis de ambiente).

### Variáveis de Ambiente

Copie `.env.example` para `.env.local`:

```
JWT_SECRET=sua-chave-secreta-aqui
SEED_DEMO_DATA=true
# DATABASE_DIR=./data
```

---

## 8. Cálculo do Ranking

```
Percentual = (pontos obtidos ÷ pontos distribuídos) × 100
```

**Critérios de desempate:**
1. Maior quantidade de pontos obtidos
2. Maior quantidade de pontos distribuídos
3. Data de ingresso na instituição (mais antigo primeiro)

---

## 9. Funcionalidades Implementadas

- [x] Autenticação individual por login e senha
- [x] 3 perfis de acesso com permissões granulares
- [x] CRUD de disciplinas, discentes e usuários
- [x] Lançamento individual e coletivo de notas
- [x] Importação assistida de notas via JSON
- [x] Autorização/bloqueio de lançamento pelo discente
- [x] Ranking automático com desempate
- [x] Ranking censurado para discentes
- [x] Comparação entre pelotões selecionados
- [x] Histórico completo de auditoria (imutável)
- [x] Relatórios administrativos com exportação PDF
- [x] Backup, exportação JSON e restauração
- [x] Painéis personalizados por perfil
- [x] Interface responsiva (desktop, tablet, mobile)
- [x] Tabelas com pesquisa, filtros, ordenação e paginação
- [x] Detecção de divergências entre pelotões
- [x] Controle de atualização por pelotão

---

## 10. Publicação

### Render (recomendado)

1. Envie o código para o GitHub
2. Crie um **Web Service** ou **Blueprint** no Render usando `render.yaml`
3. Configure disco persistente em `/var/data` e `DATABASE_DIR=/var/data`
4. Defina `JWT_SECRET` e `SEED_DEMO_DATA=true` na primeira implantação

Detalhes: **[DEPLOY.md](./DEPLOY.md)**

### VPS / servidor dedicado

1. Configure `JWT_SECRET` com valor seguro
2. Execute `npm run build && npm run start:render`
3. Configure um proxy reverso (Nginx) apontando para a porta 3000
4. Configure backup automático da pasta `data/` (ou `DATABASE_DIR`)
5. Use PM2 ou systemd para manter o processo ativo

```bash
# Exemplo com PM2
npm install -g pm2
pm2 start npm --name "cfs2026" -- run start:render
pm2 save
```

---

Desenvolvido para o **CFS 2026 — Curso de Formação de Sargentos**.
