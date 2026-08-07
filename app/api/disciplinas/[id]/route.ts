import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireRole, apiError, apiSuccess } from '@/lib/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(['CONTROLADOR_GERAL']);
  if (auth instanceof Response) return auth;

  const db = getDb();
  const existing = db.prepare('SELECT * FROM disciplinas WHERE id = ?').get(params.id);
  if (!existing) return apiError('Disciplina não encontrada', 404);

  const body = await request.json();
  const fields = [
    'nome', 'carga_horaria', 'tipo_avaliacao', 'possui_avc', 'possui_avf', 'qtd_trabalhos',
    'max_trabalho', 'max_trabalho_1', 'max_trabalho_2', 'max_avc', 'max_avf',
    'pontos_distribuidos', 'participa_ranking', 'participa_media', 'ordem',
  ] as const;

  const updates: string[] = [];
  const values: (string | number)[] = [];
  for (const f of fields) {
    if (body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(body[f]);
    }
  }

  if (updates.length === 0) return apiError('Nenhum campo para atualizar');

  db.prepare(`UPDATE disciplinas SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...values, params.id);
  return apiSuccess({ success: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(['CONTROLADOR_GERAL']);
  if (auth instanceof Response) return auth;

  const db = getDb();
  const existing = db.prepare('SELECT * FROM disciplinas WHERE id = ?').get(params.id) as { nome: string; ordem: number } | undefined;
  if (!existing) return apiError('Disciplina não encontrada', 404);

  if (existing.ordem > 0) {
    return apiError('Disciplinas oficiais do CFS 2026 não podem ser excluídas');
  }

  const notasCount = (db.prepare('SELECT COUNT(*) as c FROM notas WHERE disciplina_id = ?').get(params.id) as { c: number }).c;
  if (notasCount > 0) return apiError('Não é possível excluir disciplina com notas lançadas');

  db.prepare('DELETE FROM autorizacoes_discente WHERE disciplina_id = ?').run(params.id);
  db.prepare('DELETE FROM disciplinas WHERE id = ?').run(params.id);
  return apiSuccess({ success: true });
}
