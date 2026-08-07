import { requireAuth, apiSuccess } from '@/lib/api-helpers';
import { getDb } from '@/lib/db';
import { getCamposAvaliacao } from '@/lib/avaliacao';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const db = getDb();
  const disciplinas = db.prepare('SELECT * FROM disciplinas ORDER BY ordem, nome').all();

  const enriched = disciplinas.map((d) => ({
    ...d,
    campos: getCamposAvaliacao(d as unknown as import('@/lib/types').Disciplina),
  }));

  return apiSuccess(enriched);
}
