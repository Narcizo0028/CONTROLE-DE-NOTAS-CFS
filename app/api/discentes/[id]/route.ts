import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, apiError, apiSuccess } from '@/lib/api-helpers';
import { logAudit } from '@/lib/audit';
import { canAccessDiscente } from '@/lib/permissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const db = getDb();
  const discente = db.prepare(`
    SELECT d.*, p.nome as pelotao_nome, p.numero as pelotao_numero
    FROM discentes d
    JOIN pelotoes p ON p.id = d.pelotao_id
    WHERE d.id = ?
  `).get(params.id) as { id: string; pelotao_id: string } | undefined;

  if (!discente) return apiError('Discente não encontrado', 404);
  if (!canAccessDiscente(auth.user, discente.pelotao_id, discente.id)) {
    return apiError('Acesso negado', 403);
  }

  const notas = db.prepare(`
    SELECT n.*, disc.nome as disciplina_nome, disc.pontos_distribuidos, u.nome as lancado_por_nome
    FROM notas n
    JOIN disciplinas disc ON disc.id = n.disciplina_id
    JOIN users u ON u.id = n.lancado_por_id
    WHERE n.discente_id = ?
    ORDER BY disc.nome
  `).all(params.id);

  return apiSuccess({ ...discente, notas });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const db = getDb();
  const existing = db.prepare('SELECT * FROM discentes WHERE id = ?').get(params.id) as {
    id: string; pelotao_id: string; nome: string; matricula: string;
  } | undefined;

  if (!existing) return apiError('Discente não encontrado', 404);
  if (!canAccessDiscente(auth.user, existing.pelotao_id, existing.id)) {
    return apiError('Acesso negado', 403);
  }

  const { nome, matricula } = await request.json();
  const updates: Record<string, string> = {};
  if (nome) updates.nome = nome;
  if (matricula) updates.matricula = matricula;

  if (Object.keys(updates).length === 0) return apiError('Nenhum campo para atualizar');

  const setClause = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE discentes SET ${setClause}, updated_at = datetime('now') WHERE id = ?`).run(
    ...Object.values(updates),
    params.id
  );

  logAudit({
    user: auth.user,
    pelotao_id: existing.pelotao_id,
    discente_id: params.id,
    acao: 'EDICAO',
    valor_anterior: JSON.stringify(existing),
    valor_novo: JSON.stringify(updates),
    motivo: 'Edição de discente',
  });

  return apiSuccess({ success: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const db = getDb();
  const existing = db.prepare('SELECT * FROM discentes WHERE id = ?').get(params.id) as {
    id: string; pelotao_id: string; nome: string; user_id: string | null;
  } | undefined;

  if (!existing) return apiError('Discente não encontrado', 404);
  if (!canAccessDiscente(auth.user, existing.pelotao_id)) {
    return apiError('Acesso negado', 403);
  }

  db.prepare('DELETE FROM notas WHERE discente_id = ?').run(params.id);
  if (existing.user_id) {
    db.prepare('DELETE FROM users WHERE id = ?').run(existing.user_id);
  }
  db.prepare('DELETE FROM discentes WHERE id = ?').run(params.id);

  logAudit({
    user: auth.user,
    pelotao_id: existing.pelotao_id,
    discente_id: params.id,
    acao: 'EXCLUSAO',
    valor_anterior: existing.nome,
    motivo: 'Exclusão de discente',
  });

  return apiSuccess({ success: true });
}
