import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, requireRole, apiError, apiSuccess } from '@/lib/api-helpers';
import { isControladorGeral, isControladorPelotao, isDiscente, canAccessDiscente } from '@/lib/permissions';
import { salvarNota } from '@/lib/notas-service';
import type { Disciplina, LancamentoNota, TipoLancamento } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getTipoLancamento(role: string): TipoLancamento {
  if (role === 'CONTROLADOR_GERAL') return 'CONTROLADOR_GERAL';
  if (role === 'CONTROLADOR_PELOTÃO') return 'CONTROLADOR_PELOTÃO';
  return 'DISCENTE';
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const db = getDb();
  const { searchParams } = new URL(request.url);
  const discenteId = searchParams.get('discente_id');
  const pelotaoId = searchParams.get('pelotao_id');
  const disciplinaId = searchParams.get('disciplina_id');

  let query = `
    SELECT n.*, d.nome as discente_nome, d.matricula, d.pelotao_id,
           disc.nome as disciplina_nome, disc.pontos_distribuidos, disc.tipo_avaliacao,
           disc.carga_horaria, disc.participa_ranking, disc.participa_media,
           u.nome as lancado_por_nome, p.nome as pelotao_nome, p.numero as pelotao_numero
    FROM notas n
    JOIN discentes d ON d.id = n.discente_id
    JOIN disciplinas disc ON disc.id = n.disciplina_id
    JOIN users u ON u.id = n.lancado_por_id
    JOIN pelotoes p ON p.id = d.pelotao_id
    WHERE 1=1
  `;
  const params: string[] = [];

  if (discenteId) { query += ' AND n.discente_id = ?'; params.push(discenteId); }
  if (pelotaoId) { query += ' AND d.pelotao_id = ?'; params.push(pelotaoId); }
  if (disciplinaId) { query += ' AND n.disciplina_id = ?'; params.push(disciplinaId); }

  if (!isControladorGeral(auth.user)) {
    if (isControladorPelotao(auth.user) && auth.user.pelotao_id) {
      query += ' AND d.pelotao_id = ?';
      params.push(auth.user.pelotao_id);
    } else if (isDiscente(auth.user) && auth.user.discente_id) {
      query += ' AND n.discente_id = ?';
      params.push(auth.user.discente_id);
    }
  }

  query += ' ORDER BY disc.ordem, d.nome';
  return apiSuccess(db.prepare(query).all(...params));
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const body = await request.json();
  const { discente_id, disciplina_id, motivo, ...campos } = body;

  if (!discente_id || !disciplina_id) {
    return apiError('Discente e disciplina são obrigatórios');
  }

  const db = getDb();
  const discente = db.prepare('SELECT * FROM discentes WHERE id = ?').get(discente_id) as {
    id: string; pelotao_id: string; nome: string;
  } | undefined;
  if (!discente) return apiError('Discente não encontrado', 404);

  const disciplina = db.prepare('SELECT * FROM disciplinas WHERE id = ?').get(disciplina_id) as Disciplina | undefined;
  if (!disciplina) return apiError('Disciplina não encontrada', 404);

  if (isDiscente(auth.user)) {
    if (auth.user.discente_id !== discente_id) return apiError('Acesso negado', 403);
    const autorizacao = db.prepare(`
      SELECT status FROM autorizacoes_discente WHERE pelotao_id = ? AND disciplina_id = ?
    `).get(discente.pelotao_id, disciplina_id) as { status: string } | undefined;
    if (!autorizacao || autorizacao.status !== 'ATIVA') {
      return apiError('Lançamento não autorizado para esta disciplina', 403);
    }
  } else if (!canAccessDiscente(auth.user, discente.pelotao_id, discente_id)) {
    return apiError('Acesso negado', 403);
  }

  const valores: LancamentoNota = {
    trabalho: campos.trabalho,
    trabalho_1: campos.trabalho_1,
    trabalho_2: campos.trabalho_2,
    avc: campos.avc,
    avf: campos.avf,
    situacao: campos.situacao,
  };

  try {
    const result = db.transaction(() => {
      return salvarNota(db, {
      discente_id,
      disciplina_id,
      pelotao_id: discente.pelotao_id,
      disciplina,
      valores,
      user: auth.user,
      tipoLancamento: getTipoLancamento(auth.user.role),
      motivo,
      });
    })();
    return apiSuccess(result, result.created ? 201 : 200);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Erro ao salvar nota');
  }
}
