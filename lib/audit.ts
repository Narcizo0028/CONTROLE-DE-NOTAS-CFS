import { v4 as uuidv4 } from 'uuid';
import { getDb } from './db';
import type { AuditAction, SessionUser, UserRole } from './types';

interface AuditParams {
  user?: SessionUser | null;
  pelotao_id?: string | null;
  discente_id?: string | null;
  disciplina_id?: string | null;
  tipo_avaliacao?: string | null;
  valor_anterior?: string | null;
  valor_novo?: string | null;
  acao: AuditAction;
  motivo?: string | null;
  ip_address?: string | null;
}

export function logAudit(params: AuditParams) {
  const db = getDb();
  db.prepare(`
    INSERT INTO audit_log (id, user_id, user_nome, user_role, pelotao_id, discente_id, disciplina_id, tipo_avaliacao, valor_anterior, valor_novo, acao, motivo, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    uuidv4(),
    params.user?.id ?? null,
    params.user?.nome ?? null,
    params.user?.role ?? null,
    params.pelotao_id ?? null,
    params.discente_id ?? null,
    params.disciplina_id ?? null,
    params.tipo_avaliacao ?? null,
    params.valor_anterior ?? null,
    params.valor_novo ?? null,
    params.acao,
    params.motivo ?? null,
    params.ip_address ?? null
  );
}

export function logLoginAttempt(login: string, success: boolean, ip?: string) {
  const db = getDb();
  db.prepare(`
    INSERT INTO login_attempts (id, login, ip_address, success)
    VALUES (?, ?, ?, ?)
  `).run(uuidv4(), login, ip ?? null, success ? 1 : 0);
}

export function updatePelotaoUltimaAtualizacao(pelotaoId: string) {
  const db = getDb();
  db.prepare(`UPDATE pelotoes SET ultima_atualizacao = datetime('now') WHERE id = ?`).run(pelotaoId);
}

export function getAuditLogs(filters?: {
  pelotao_id?: string;
  discente_id?: string;
  disciplina_id?: string;
  acao?: string;
  user_id?: string;
  data_inicio?: string;
  data_fim?: string;
  limit?: number;
  offset?: number;
}) {
  const db = getDb();
  let query = 'SELECT * FROM audit_log WHERE 1=1';
  const params: (string | number)[] = [];

  if (filters?.pelotao_id) {
    query += ' AND pelotao_id = ?';
    params.push(filters.pelotao_id);
  }
  if (filters?.discente_id) {
    query += ' AND discente_id = ?';
    params.push(filters.discente_id);
  }
  if (filters?.disciplina_id) {
    query += ' AND disciplina_id = ?';
    params.push(filters.disciplina_id);
  }
  if (filters?.acao) {
    query += ' AND acao = ?';
    params.push(filters.acao);
  }
  if (filters?.user_id) {
    query += ' AND user_id = ?';
    params.push(filters.user_id);
  }
  if (filters?.data_inicio) {
    query += ' AND created_at >= ?';
    params.push(filters.data_inicio);
  }
  if (filters?.data_fim) {
    query += ' AND created_at <= ?';
    params.push(filters.data_fim);
  }

  query += ' ORDER BY created_at DESC';

  if (filters?.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
    if (filters?.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }
  }

  return db.prepare(query).all(...params);
}

export function getAuditCount(filters?: { pelotao_id?: string }) {
  const db = getDb();
  if (filters?.pelotao_id) {
    return (db.prepare('SELECT COUNT(*) as count FROM audit_log WHERE pelotao_id = ?').get(filters.pelotao_id) as { count: number }).count;
  }
  return (db.prepare('SELECT COUNT(*) as count FROM audit_log').get() as { count: number }).count;
}
