import { v4 as uuidv4 } from 'uuid';
import type { DbInstance } from './db';
import type { Disciplina, LancamentoNota, TipoLancamento, SessionUser } from './types';
import { validarLancamento, prepararNotaParaSalvar, formatNotaResumo } from './avaliacao';
import { logAudit, updatePelotaoUltimaAtualizacao } from './audit';

export function salvarNota(
  db: DbInstance,
  params: {
    discente_id: string;
    disciplina_id: string;
    pelotao_id: string;
    disciplina: Disciplina;
    valores: LancamentoNota;
    user: SessionUser;
    tipoLancamento: TipoLancamento;
    motivo?: string;
  }
) {
  const validation = validarLancamento(params.disciplina, params.valores);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const dados = prepararNotaParaSalvar(params.disciplina, params.valores);
  const resumo = formatNotaResumo(params.disciplina, { ...params.valores, ...dados });

  const existing = db.prepare('SELECT * FROM notas WHERE discente_id = ? AND disciplina_id = ?').get(
    params.discente_id, params.disciplina_id
  ) as { id: string; nota_final: number | null; situacao: string | null } | undefined;

  if (existing) {
    db.prepare(`
      UPDATE notas SET
        trabalho = ?, trabalho_1 = ?, trabalho_2 = ?, avc = ?, avf = ?,
        situacao = ?, nota_final = ?, pontos_obtidos = ?,
        lancado_por_id = ?, tipo_lancamento = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      dados.trabalho, dados.trabalho_1, dados.trabalho_2, dados.avc, dados.avf,
      dados.situacao, dados.nota_final, dados.pontos_obtidos,
      params.user.id, params.tipoLancamento, existing.id
    );

    logAudit({
      user: params.user,
      pelotao_id: params.pelotao_id,
      discente_id: params.discente_id,
      disciplina_id: params.disciplina_id,
      acao: 'CORRECAO',
      valor_anterior: existing.situacao || String(existing.nota_final ?? ''),
      valor_novo: resumo,
      motivo: params.motivo || 'Correção de nota',
    });

    updatePelotaoUltimaAtualizacao(params.pelotao_id);
    return { id: existing.id, updated: true, resumo, nota_final: dados.nota_final, situacao: dados.situacao };
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO notas (
      id, discente_id, disciplina_id, trabalho, trabalho_1, trabalho_2, avc, avf,
      situacao, nota_final, pontos_obtidos, lancado_por_id, tipo_lancamento
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, params.discente_id, params.disciplina_id,
    dados.trabalho, dados.trabalho_1, dados.trabalho_2, dados.avc, dados.avf,
    dados.situacao, dados.nota_final, dados.pontos_obtidos,
    params.user.id, params.tipoLancamento
  );

  logAudit({
    user: params.user,
    pelotao_id: params.pelotao_id,
    discente_id: params.discente_id,
    disciplina_id: params.disciplina_id,
    acao: 'LANCAMENTO',
    valor_novo: resumo,
    motivo: params.motivo || 'Lançamento de nota',
  });

  updatePelotaoUltimaAtualizacao(params.pelotao_id);
  return { id, created: true, resumo, nota_final: dados.nota_final, situacao: dados.situacao };
}
