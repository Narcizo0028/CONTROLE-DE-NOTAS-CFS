import type { DatabaseSync } from 'node:sqlite';

export interface DiscenteImportItem {
  nome?: string;
  matricula?: string;
  pelotao?: string;
  pelotao_nome?: string;
  pelotao_numero?: number | string;
  pelotao_id?: string;
  posto_graduacao?: string;
  senha?: string;
}

export interface DiscenteImportPreviewItem {
  matricula: string;
  nome: string;
  posto_graduacao: string;
  pelotao_nome: string;
  acao: 'INCLUIR' | 'ATUALIZAR' | 'REJEITAR';
  motivo?: string;
}

export interface DiscenteImportProcessItem {
  acao: 'INCLUIR' | 'ATUALIZAR';
  discente_id?: string;
  nome: string;
  matricula: string;
  pelotao_id: string;
  posto_graduacao: string;
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
    posto_graduacao: raw.posto_graduacao != null ? stripHtml(String(raw.posto_graduacao)) : undefined,
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
        posto_graduacao: '?',
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
        posto_graduacao: '?',
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
        posto_graduacao: '?',
        acao: 'REJEITAR',
        motivo: 'Matrícula duplicada no arquivo',
      });
      continue;
    }
    matriculasNoArquivo.add(item.matricula);

    if (!item.pelotao && !item.pelotao_nome && item.pelotao_numero == null && !item.pelotao_id) {
      preview.push({
        matricula: item.matricula,
        nome: item.nome,
        pelotao_nome: '?',
        posto_graduacao: item.posto_graduacao || '?',
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
        posto_graduacao: item.posto_graduacao || '?',
        acao: 'REJEITAR',
        motivo: 'Pelotão não encontrado',
      });
      continue;
    }

    if (!item.posto_graduacao) {
      preview.push({
        matricula: item.matricula,
        nome: item.nome,
        pelotao_nome: pelotao.nome,
        posto_graduacao: '?',
        acao: 'REJEITAR',
        motivo: 'Campo "posto_graduacao" é obrigatório',
      });
      continue;
    }

    if (!item.senha || item.senha.length < 4) {
      preview.push({
        matricula: item.matricula,
        nome: item.nome,
        pelotao_nome: pelotao.nome,
        posto_graduacao: item.posto_graduacao,
        acao: 'REJEITAR',
        motivo: 'Campo "senha" é obrigatório e deve ter ao menos 4 caracteres',
      });
      continue;
    }

    const existing = db.prepare('SELECT id, user_id FROM discentes WHERE matricula = ?').get(item.matricula) as
      | { id: string; user_id: string | null }
      | undefined;

    const loginOwner = db.prepare('SELECT discente_id FROM users WHERE login = ?').get(item.matricula) as
      | { discente_id: string | null }
      | undefined;
    if (loginOwner && loginOwner.discente_id !== existing?.id) {
      preview.push({
        matricula: item.matricula,
        nome: item.nome,
        pelotao_nome: pelotao.nome,
        posto_graduacao: item.posto_graduacao,
        acao: 'REJEITAR',
        motivo: 'Matrícula já utilizada como login por outro usuário',
      });
      continue;
    }

    const acao = existing ? 'ATUALIZAR' : 'INCLUIR';
    preview.push({
      matricula: item.matricula,
      nome: item.nome,
      pelotao_nome: pelotao.nome,
      posto_graduacao: item.posto_graduacao,
      acao,
      motivo: existing ? 'Discente existente será atualizado' : undefined,
    });

    toProcess.push({
      acao,
      discente_id: existing?.id,
      nome: item.nome,
      matricula: item.matricula,
      pelotao_id: pelotao.id,
      posto_graduacao: item.posto_graduacao,
      senha: item.senha,
    });
  }

  return { preview, toProcess };
}
