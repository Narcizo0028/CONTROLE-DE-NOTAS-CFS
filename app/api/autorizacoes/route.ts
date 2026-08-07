import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db';
import { requireAuth, apiError, apiSuccess } from '@/lib/api-helpers';
import { logAudit } from '@/lib/audit';
import { canAccessPelotao } from '@/lib/permissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const db = getDb();
  const { searchParams } = new URL(request.url);
  const pelotaoId = searchParams.get('pelotao_id') || auth.user.pelotao_id;

  if (!pelotaoId) return apiError('Pelotão não informado');

  let query = `
    SELECT a.*, d.nome as disciplina_nome, d.pontos_distribuidos, p.nome as pelotao_nome
    FROM autorizacoes_discente a
    JOIN disciplinas d ON d.id = a.disciplina_id
    JOIN pelotoes p ON p.id = a.pelotao_id
    WHERE a.pelotao_id = ?
  `;

  if (!canAccessPelotao(auth.user, pelotaoId) && auth.user.role === 'DISCENTE') {
    const discente = db.prepare('SELECT pelotao_id FROM discentes WHERE id = ?').get(auth.user.discente_id) as { pelotao_id: string } | undefined;
    if (discente?.pelotao_id !== pelotaoId) return apiError('Acesso negado', 403);
  } else if (!canAccessPelotao(auth.user, pelotaoId) && auth.user.role !== 'DISCENTE') {
    return apiError('Acesso negado', 403);
  }

  const autorizacoes = db.prepare(query).all(pelotaoId);

  if (auth.user.role === 'DISCENTE') {
    return apiSuccess(autorizacoes.filter((a) => (a as { status: string }).status === 'ATIVA'));
  }

  return apiSuccess(autorizacoes);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const { pelotao_id, disciplina_id, status } = await request.json();
  const pelotaoId = pelotao_id || auth.user.pelotao_id;

  if (!pelotaoId || !disciplina_id || !status) {
    return apiError('Pelotão, disciplina e status são obrigatórios');
  }

  if (!canAccessPelotao(auth.user, pelotaoId)) {
    return apiError('Acesso negado', 403);
  }

  const db = getDb();
  const existing = db.prepare('SELECT * FROM autorizacoes_discente WHERE pelotao_id = ? AND disciplina_id = ?').get(pelotaoId, disciplina_id) as { id: string; status: string } | undefined;

  if (existing) {
    db.prepare(`UPDATE autorizacoes_discente SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, existing.id);
    logAudit({
      user: auth.user,
      pelotao_id: pelotaoId,
      disciplina_id,
      acao: status === 'ATIVA' ? 'AUTORIZACAO' : 'BLOQUEIO',
      valor_anterior: existing.status,
      valor_novo: status,
      motivo: status === 'ATIVA' ? 'Autorização de lançamento pelo discente' : 'Bloqueio de lançamento pelo discente',
    });
    return apiSuccess({ id: existing.id, updated: true });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO autorizacoes_discente (id, pelotao_id, disciplina_id, status)
    VALUES (?, ?, ?, ?)
  `).run(id, pelotaoId, disciplina_id, status);

  logAudit({
    user: auth.user,
    pelotao_id: pelotaoId,
    disciplina_id,
    acao: status === 'ATIVA' ? 'AUTORIZACAO' : 'BLOQUEIO',
    valor_novo: status,
    motivo: status === 'ATIVA' ? 'Autorização de lançamento pelo discente' : 'Bloqueio de lançamento pelo discente',
  });

  return apiSuccess({ id, created: true }, 201);
}
