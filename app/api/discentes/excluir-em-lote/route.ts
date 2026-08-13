import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, apiError, apiSuccess } from '@/lib/api-helpers';
import { logAudit } from '@/lib/audit';
import { isControladorGeral, isControladorPelotao } from '@/lib/permissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  if (!isControladorGeral(auth.user) && !isControladorPelotao(auth.user)) return apiError('Acesso negado', 403);

  const { ids } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0 || ids.some((id) => typeof id !== 'string')) return apiError('Informe ao menos um discente para excluir');

  const uniqueIds = Array.from(new Set(ids)) as string[];
  const db = getDb();
  const placeholders = uniqueIds.map(() => '?').join(', ');
  const discentes = db.prepare(`SELECT id, nome, pelotao_id, user_id FROM discentes WHERE id IN (${placeholders})`).all(...uniqueIds) as Array<{ id: string; nome: string; pelotao_id: string; user_id: string | null }>;
  if (discentes.length !== uniqueIds.length) return apiError('Um ou mais discentes não foram encontrados', 404);
  if (!isControladorGeral(auth.user) && discentes.some((d) => d.pelotao_id !== auth.user.pelotao_id)) return apiError('Acesso negado', 403);

  db.transaction(() => {
    for (const discente of discentes) {
      db.prepare('DELETE FROM notas WHERE discente_id = ?').run(discente.id);
      if (discente.user_id) db.prepare('DELETE FROM users WHERE id = ?').run(discente.user_id);
      db.prepare('DELETE FROM discentes WHERE id = ?').run(discente.id);
      logAudit({ user: auth.user, pelotao_id: discente.pelotao_id, discente_id: discente.id, acao: 'EXCLUSAO', valor_anterior: discente.nome, motivo: 'Exclusão em lote de discente' });
    }
  })();

  return apiSuccess({ excluidos: discentes.length });
}
