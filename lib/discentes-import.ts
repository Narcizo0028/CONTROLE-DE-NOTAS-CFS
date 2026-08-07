import type { DatabaseSync } from 'node:sqlite';

export interface DiscenteImportItem {
  nome?: string;
  matricula?: string;
  pelotao?: string;
  pelotao_nome?: string;
  pelotao_numero?: number | string;
  pelotao_id?: string;
  data_ingresso?: string;
  criar_login?: boolean;
  login?: string;
  senha?: string;
}

export interface DiscenteImportPreviewItem {
  matricula: string;
  nome: string;
  pelotao_nome: string;
  data_ingresso: string;
  login: string | null;
  acao: 'INCLUIR' | 'ATUALIZAR' | 'REJEITAR';
  motivo?: string;
}

export interface DiscenteImportProcessItem {
  acao: 'INCLUIR' | 'ATUALIZAR';
  discente_id?: string;
  nome: string;
  matricula: string;
  pelotao_id: string;
  data_ingresso: string;
  criar_login: boolean;
  login: string;
  senha: string;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function normalizeItem(raw: Record<string, unknown>): DiscenteImportItem {
  return {
    nome: raw.nome != null ? stripHtml(String(raw.nome)) : undefined,
    matricula: raw.matricula != null ? String(raw.matricula).trim() : undefined,
    pelotao: raw.pelotao != null ? String(raw.pelotao).trim() : undefined,
    pelotao_nome: raw.pelotao_nome != null ? String(raw.pelotao_nome).trim() : undefined,
    pelotao_numero: raw.pelotao_numero as number | string | undefined,
    pelotao_id: raw.pelotao_id != null ? String(raw.pelotao_id).trim() : undefined,
    data_ingresso: raw.data_ingresso != null ? String(raw.data_ingresso).trim() : undefined,
    criar_login: raw.criar_login === undefined ? true : Boolean(raw.criar_login),
    login: raw.login != null ? String(raw.login).trim() : undefined,
    senha: raw.senha != null ? String(raw.senha) : undefined,
  };
}

export function parseDiscentesImportPayload(json: unknown): DiscenteImportItem[] {
  if (Array.isArray(json)) {
    return json.map((item) => normalizeItem(item as Record<string, unknown>));
  }
  if (json && typeof json === 'object' && Array.isArray((json as { discentes?: unknown[] }).discentes)) {
    return (json as { discentes: unknown[] }).discentes.map((item) =>
      normalizeItem(item as Record<string, unknown>)
    );
  }
  throw new Error('Formato inválido. Use um array ou um objeto com a chave "discentes".');
}

function resolvePelotao(
  db: DatabaseSync,
  item: DiscenteImportItem
): { id: string; nome: string } | null {
  if (item.pelotao_id) {
    const row = db.prepare('SELECT id, nome FROM pelotoes WHERE id = ?').get(item.pelotao_id) as
      | { id: string; nome: string }
      | undefined;
    return row ?? null;
  }

  const numero = item.pelotao_numero ?? item.pelotao;
  if (numero !== undefined && numero !== '') {
    const n = Number(numero);
    if (!Number.isNaN(n)) {
      const row = db.prepare('SELECT id, nome FROM pelotoes WHERE numero = ?').get(n) as
        | { id: string; nome: string }
        | undefined;
      if (row) return row;
    }
  }

  const nome = item.pelotao_nome || item.pelotao;
  if (nome) {
    const row = db.prepare('SELECT id, nome FROM pelotoes WHERE nome = ? COLLATE NOCASE').get(nome) as
      | { id: string; nome: string }
      | undefined;
    if (row) return row;

    const likeMatches = db.prepare('SELECT id, nome FROM pelotoes WHERE nome LIKE ? COLLATE NOCASE').all(`%${nome}%`) as
      | { id: string; nome: string }[];
    if (likeMatches.length === 1) return likeMatches[0];
  }

  return null;
}

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

function defaultDataIngresso(): string {
  return '2026-01-01';
}

export function buildDiscentesImportPreview(
  db: DatabaseSync,
  items: DiscenteImportItem[]
): { preview: DiscenteImportPreviewItem[]; toProcess: DiscenteImportProcessItem[] } {
  const preview: DiscenteImportPreviewItem[] = [];
  const toProcess: DiscenteImportProcessItem[] = [];
  const matriculasNoArquivo = new Set<string>();

  for (const item of items) {
    const matricula = item.matricula || '?';

    if (!item.nome) {
      preview.push({
        matricula,
        nome: '?',
        pelotao_nome: '?',
        data_ingresso: item.data_ingresso || '?',
        login: null,
        acao: 'REJEITAR',
        motivo: 'Campo "nome" é obrigatório',
      });
      continue;
    }

    if (!item.matricula) {
      preview.push({
        matricula: '?',
        nome: item.nome,
        pelotao_nome: '?',
        data_ingresso: item.data_ingresso || '?',
        login: null,
        acao: 'REJEITAR',
        motivo: 'Campo "matricula" é obrigatório',
      });
      continue;
    }

    if (matriculasNoArquivo.has(item.matricula)) {
      preview.push({
        matricula: item.matricula,
        nome: item.nome,
        pelotao_nome: '?',
        data_ingresso: item.data_ingresso || '?',
        login: null,
        acao: 'REJEITAR',
        motivo: 'Matrícula duplicada no arquivo',
      });
      continue;
    }
    matriculasNoArquivo.add(item.matricula);

    const dataIngresso = item.data_ingresso?.trim() || defaultDataIngresso();
    if (item.data_ingresso && !isValidDate(item.data_ingresso)) {
      preview.push({
        matricula: item.matricula,
        nome: item.nome,
        pelotao_nome: '?',
        data_ingresso: item.data_ingresso,
        login: null,
        acao: 'REJEITAR',
        motivo: 'Campo "data_ingresso" inválido (use AAAA-MM-DD)',
      });
      continue;
    }

    if (!item.pelotao && !item.pelotao_nome && item.pelotao_numero == null && !item.pelotao_id) {
      preview.push({
        matricula: item.matricula,
        nome: item.nome,
        pelotao_nome: '?',
        data_ingresso: dataIngresso,
        login: null,
        acao: 'REJEITAR',
        motivo: 'Campo "pelotao" é obrigatório',
      });
      continue;
    }

    const pelotao = resolvePelotao(db, item);
    if (!pelotao) {
      preview.push({
        matricula: item.matricula,
        nome: item.nome,
        pelotao_nome: '?',
        data_ingresso: dataIngresso,
        login: null,
        acao: 'REJEITAR',
        motivo: 'Pelotão não encontrado',
      });
      continue;
    }

    const login = item.login || item.matricula;
    const senha = item.senha ?? item.matricula;
    const criarLogin = item.criar_login !== false;

    if (criarLogin && login.length < 3) {
      preview.push({
        matricula: item.matricula,
        nome: item.nome,
        pelotao_nome: pelotao.nome,
        data_ingresso: dataIngresso,
        login,
        acao: 'REJEITAR',
        motivo: 'Login inválido (mínimo 3 caracteres)',
      });
      continue;
    }

    if (criarLogin && senha.length < 4) {
      preview.push({
        matricula: item.matricula,
        nome: item.nome,
        pelotao_nome: pelotao.nome,
        data_ingresso: dataIngresso,
        login,
        acao: 'REJEITAR',
        motivo: 'Senha inválida (mínimo 4 caracteres)',
      });
      continue;
    }

    const existing = db.prepare('SELECT id, user_id FROM discentes WHERE matricula = ?').get(item.matricula) as
      | { id: string; user_id: string | null }
      | undefined;

    if (criarLogin) {
      const loginOwner = db.prepare('SELECT id, discente_id FROM users WHERE login = ?').get(login) as
        | { id: string; discente_id: string | null }
        | undefined;
      if (loginOwner && loginOwner.discente_id !== existing?.id) {
        preview.push({
          matricula: item.matricula,
          nome: item.nome,
          pelotao_nome: pelotao.nome,
          data_ingresso: dataIngresso,
          login,
          acao: 'REJEITAR',
          motivo: 'Login já utilizado por outro usuário',
        });
        continue;
      }
    }

    const acao = existing ? 'ATUALIZAR' : 'INCLUIR';
    preview.push({
      matricula: item.matricula,
      nome: item.nome,
      pelotao_nome: pelotao.nome,
      data_ingresso: dataIngresso,
      login: criarLogin ? login : null,
      acao,
      motivo: existing ? 'Discente existente será atualizado' : undefined,
    });

    toProcess.push({
      acao,
      discente_id: existing?.id,
      nome: item.nome,
      matricula: item.matricula,
      pelotao_id: pelotao.id,
      data_ingresso: dataIngresso,
      criar_login: criarLogin,
      login,
      senha,
    });
  }

  return { preview, toProcess };
}
