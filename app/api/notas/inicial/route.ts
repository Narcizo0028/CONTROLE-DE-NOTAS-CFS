import { getDb } from '@/lib/db';
import { requireAuth, apiSuccess } from '@/lib/api-helpers';
import { getCamposAvaliacao } from '@/lib/avaliacao';
import { isControladorGeral, isControladorPelotao, isDiscente } from '@/lib/permissions';
import type { Disciplina } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const db = getDb();
  const disciplinas = db.prepare('SELECT * FROM disciplinas ORDER BY ordem, nome').all()
    .map((disciplina) => ({
      ...disciplina,
      campos: getCamposAvaliacao(disciplina as unknown as Disciplina),
    }));

  let discenteWhere = '';
  let notaWhere = '';
  const discenteParams: string[] = [];
  const notaParams: string[] = [];
  if (!isControladorGeral(auth.user)) {
    if (isControladorPelotao(auth.user) && auth.user.pelotao_id) {
      discenteWhere = ' WHERE d.pelotao_id = ?';
      notaWhere = ' AND d.pelotao_id = ?';
      discenteParams.push(auth.user.pelotao_id);
      notaParams.push(auth.user.pelotao_id);
    } else if (isDiscente(auth.user) && auth.user.discente_id) {
      discenteWhere = ' WHERE d.id = ?';
      notaWhere = ' AND n.discente_id = ?';
      discenteParams.push(auth.user.discente_id);
      notaParams.push(auth.user.discente_id);
    }
  }

  const discentes = db.prepare(`
    SELECT d.id, d.nome, d.matricula
    FROM discentes d${discenteWhere}
    ORDER BY d.nome
  `).all(...discenteParams);

  const notas = db.prepare(`
    SELECT n.*, d.nome as discente_nome, d.matricula, d.pelotao_id,
           disc.nome as disciplina_nome, disc.pontos_distribuidos, disc.tipo_avaliacao,
           disc.carga_horaria, disc.participa_ranking, disc.participa_media,
           u.nome as lancado_por_nome, p.nome as pelotao_nome, p.numero as pelotao_numero
    FROM notas n
    JOIN discentes d ON d.id = n.discente_id
    JOIN disciplinas disc ON disc.id = n.disciplina_id
    JOIN users u ON u.id = n.lancado_por_id
    JOIN pelotoes p ON p.id = d.pelotao_id
    WHERE 1=1${notaWhere}
    ORDER BY disc.ordem, d.nome
  `).all(...notaParams);

  return apiSuccess({ disciplinas, discentes, notas });
}
