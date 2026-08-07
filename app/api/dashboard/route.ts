import { getDb } from '@/lib/db';
import { requireAuth, apiSuccess } from '@/lib/api-helpers';
import { getPelotaoUpdateStatus, getDivergencias, calculateRanking } from '@/lib/ranking';
import { isControladorGeral, isControladorPelotao, isDiscente } from '@/lib/permissions';
import { getDiscenteRanking } from '@/lib/ranking';
import { applyRankingPrivacy } from '@/lib/utils';
export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const db = getDb();

  if (isControladorGeral(auth.user)) {
    const totalDiscentes = (db.prepare('SELECT COUNT(*) as c FROM discentes').get() as { c: number }).c;
    const totalPelotoes = (db.prepare('SELECT COUNT(*) as c FROM pelotoes').get() as { c: number }).c;
    const totalDisciplinas = (db.prepare('SELECT COUNT(*) as c FROM disciplinas').get() as { c: number }).c;
    const totalNotas = (db.prepare('SELECT COUNT(*) as c FROM notas').get() as { c: number }).c;
    const lancamentosHoje = (db.prepare(`SELECT COUNT(*) as c FROM notas WHERE date(created_at) = date('now')`).get() as { c: number }).c;
    const pelotaoStatus = getPelotaoUpdateStatus();
    const divergencias = getDivergencias();

    return apiSuccess({
      role: 'CONTROLADOR_GERAL',
      stats: { totalDiscentes, totalPelotoes, totalDisciplinas, totalNotas, lancamentosHoje },
      pelotaoStatus,
      divergencias,
      rankingTop5: calculateRanking().slice(0, 5),
    });
  }

  if (isControladorPelotao(auth.user) && auth.user.pelotao_id) {
    const pelotaoId = auth.user.pelotao_id;
    const totalDiscentes = (db.prepare('SELECT COUNT(*) as c FROM discentes WHERE pelotao_id = ?').get(pelotaoId) as { c: number }).c;
    const totalDisciplinas = (db.prepare('SELECT COUNT(*) as c FROM disciplinas').get() as { c: number }).c;
    const totalNotas = (db.prepare(`SELECT COUNT(*) as c FROM notas n JOIN discentes d ON d.id = n.discente_id WHERE d.pelotao_id = ?`).get(pelotaoId) as { c: number }).c;
    const pelotao = db.prepare('SELECT * FROM pelotoes WHERE id = ?').get(pelotaoId);
    const autorizacoesAtivas = (db.prepare(`SELECT COUNT(*) as c FROM autorizacoes_discente WHERE pelotao_id = ? AND status = 'ATIVA'`).get(pelotaoId) as { c: number }).c;
    const notasPendentes = totalDiscentes * totalDisciplinas - totalNotas;
    const ranking = calculateRanking([pelotaoId]).slice(0, 5);

    return apiSuccess({
      role: 'CONTROLADOR_PELOTÃO',
      stats: { totalDiscentes, totalDisciplinas, totalNotas, notasPendentes, autorizacoesAtivas },
      pelotao,
      ranking,
    });
  }

  if (isDiscente(auth.user) && auth.user.discente_id) {
    const discente = db.prepare(`
      SELECT d.*, p.nome as pelotao_nome, p.numero as pelotao_numero
      FROM discentes d JOIN pelotoes p ON p.id = d.pelotao_id WHERE d.id = ?
    `).get(auth.user.discente_id);
    const rankingGeral = getDiscenteRanking(auth.user.discente_id);
    const rankingPelotao = getDiscenteRanking(auth.user.discente_id, [auth.user.pelotao_id!]);
    const notas = db.prepare(`
      SELECT n.*, disc.nome as disciplina_nome, disc.pontos_distribuidos
      FROM notas n JOIN disciplinas disc ON disc.id = n.disciplina_id
      WHERE n.discente_id = ? ORDER BY disc.nome
    `).all(auth.user.discente_id);
    const autorizacoes = db.prepare(`
      SELECT a.*, d.nome as disciplina_nome, d.pontos_distribuidos
      FROM autorizacoes_discente a JOIN disciplinas d ON d.id = a.disciplina_id
      WHERE a.pelotao_id = ? AND a.status = 'ATIVA'
    `).all(auth.user.pelotao_id);

    return apiSuccess({
      role: 'DISCENTE',
      discente,
      rankingGeral,
      rankingPelotao,
      notas,
      autorizacoes,
      rankingCensurado: applyRankingPrivacy(calculateRanking().slice(0, 10), auth.user.discente_id),
      rankingPelotaoCensurado: applyRankingPrivacy(
        calculateRanking([auth.user.pelotao_id!]).slice(0, 10),
        auth.user.discente_id
      ),    });
  }

  return apiSuccess({ role: auth.user.role });
}
