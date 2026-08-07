import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, apiError, apiSuccess } from '@/lib/api-helpers';
import { logAudit, updatePelotaoUltimaAtualizacao } from '@/lib/audit';
import { canAccessDiscente } from '@/lib/permissions';
import { validarLancamento, prepararNotaParaSalvar, formatNotaResumo } from '@/lib/avaliacao';
import type { Disciplina, LancamentoNota } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const body = await request.json();
  const { motivo, ...campos } = body;

  const db = getDb();
  const nota = db.prepare(`
    SELECT n.*, d.pelotao_id
    FROM notas n
    JOIN discentes d ON d.id = n.discente_id
    WHERE n.id = ?
  `).get(params.id) as Record<string, unknown> | undefined;

  if (!nota) return apiError('Nota não encontrada', 404);
  if (!canAccessDiscente(auth.user, nota.pelotao_id as string)) {
    return apiError('Acesso negado', 403);
  }

  const disciplina = db.prepare('SELECT * FROM disciplinas WHERE id = ?').get(nota.disciplina_id as string) as Disciplina | undefined;
  if (!disciplina) return apiError('Disciplina não encontrada', 404);
  const valores: LancamentoNota = {
    trabalho: campos.trabalho ?? nota.trabalho,
    trabalho_1: campos.trabalho_1 ?? nota.trabalho_1,
    trabalho_2: campos.trabalho_2 ?? nota.trabalho_2,
    avc: campos.avc ?? nota.avc,
    avf: campos.avf ?? nota.avf,
    situacao: campos.situacao ?? nota.situacao,
  };

  const validation = validarLancamento(disciplina, valores);
  if (!validation.valid) return apiError(validation.error!);

  const dados = prepararNotaParaSalvar(disciplina, valores);
  const resumoAnt = formatNotaResumo(disciplina, nota as LancamentoNota);
  const resumoNovo = formatNotaResumo(disciplina, { ...valores, ...dados });

  db.prepare(`
    UPDATE notas SET
      trabalho = ?, trabalho_1 = ?, trabalho_2 = ?, avc = ?, avf = ?,
      situacao = ?, nota_final = ?, pontos_obtidos = ?,
      lancado_por_id = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    dados.trabalho, dados.trabalho_1, dados.trabalho_2, dados.avc, dados.avf,
    dados.situacao, dados.nota_final, dados.pontos_obtidos,
    auth.user.id, params.id
  );

  logAudit({
    user: auth.user,
    pelotao_id: nota.pelotao_id as string,
    discente_id: nota.discente_id as string,
    disciplina_id: nota.disciplina_id as string,
    acao: 'CORRECAO',
    valor_anterior: resumoAnt,
    valor_novo: resumoNovo,
    motivo: motivo || 'Correção de nota',
  });

  updatePelotaoUltimaAtualizacao(nota.pelotao_id as string);
  return apiSuccess({ success: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const db = getDb();
  const nota = db.prepare(`
    SELECT n.*, d.pelotao_id, d.nome as discente_nome, disc.nome as disciplina_nome
    FROM notas n
    JOIN discentes d ON d.id = n.discente_id
    JOIN disciplinas disc ON disc.id = n.disciplina_id
    WHERE n.id = ?
  `).get(params.id) as {
    id: string; discente_id: string; disciplina_id: string; pelotao_id: string;
    discente_nome: string; disciplina_nome: string; nota_final: number | null; situacao: string | null;
  } | undefined;

  if (!nota) return apiError('Nota não encontrada', 404);
  if (!canAccessDiscente(auth.user, nota.pelotao_id)) {
    return apiError('Acesso negado', 403);
  }

  db.prepare('DELETE FROM notas WHERE id = ?').run(params.id);

  logAudit({
    user: auth.user,
    pelotao_id: nota.pelotao_id,
    discente_id: nota.discente_id,
    disciplina_id: nota.disciplina_id,
    acao: 'EXCLUSAO',
    valor_anterior: nota.situacao || String(nota.nota_final ?? ''),
    motivo: `Exclusão: ${nota.discente_nome} - ${nota.disciplina_nome}`,
  });

  updatePelotaoUltimaAtualizacao(nota.pelotao_id);
  return apiSuccess({ success: true });
}
