import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, apiError, apiSuccess } from '@/lib/api-helpers';
import { logAudit, updatePelotaoUltimaAtualizacao } from '@/lib/audit';
import { canAccessPelotao } from '@/lib/permissions';
import { parseLancamentoFromImport, formatNotaResumo } from '@/lib/avaliacao';
import { salvarNota } from '@/lib/notas-service';
import type { Disciplina, ImportPreviewItem, TipoLancamento } from '@/lib/types';

interface ImportItem {
  matricula: string;
  disciplina: string;
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const body = await request.json();
  const { pelotao_id, data, confirm } = body;
  const pelotaoId = pelotao_id || auth.user.pelotao_id;

  if (!pelotaoId) return apiError('Pelotão não informado');
  if (!canAccessPelotao(auth.user, pelotaoId)) return apiError('Acesso negado', 403);
  if (!data || !Array.isArray(data)) return apiError('Dados de importação inválidos');

  const db = getDb();
  const preview: ImportPreviewItem[] = [];
  const toProcess: { discente_id: string; disciplina: Disciplina; valores: ReturnType<typeof parseLancamentoFromImport>['valores']; acao: 'INCLUIR' | 'ATUALIZAR' }[] = [];

  for (const item of data as ImportItem[]) {
    if (!item.matricula || !item.disciplina) {
      preview.push({
        discente_matricula: item.matricula || '?',
        discente_nome: '?',
        disciplina_nome: item.disciplina || '?',
        resumo: '—',
        nota_final: null,
        situacao: null,
        acao: 'REJEITAR',
        motivo: 'Campos obrigatórios ausentes (matricula, disciplina)',
      });
      continue;
    }

    const discente = db.prepare('SELECT * FROM discentes WHERE matricula = ? AND pelotao_id = ?').get(item.matricula, pelotaoId) as { id: string; nome: string } | undefined;
    if (!discente) {
      preview.push({
        discente_matricula: item.matricula,
        discente_nome: '?',
        disciplina_nome: item.disciplina,
        resumo: '—',
        nota_final: null,
        situacao: null,
        acao: 'REJEITAR',
        motivo: 'Discente não encontrado neste pelotão',
      });
      continue;
    }

    const disciplina = db.prepare('SELECT * FROM disciplinas WHERE nome = ?').get(item.disciplina) as Disciplina | undefined;
    if (!disciplina) {
      preview.push({
        discente_matricula: item.matricula,
        discente_nome: discente.nome,
        disciplina_nome: item.disciplina,
        resumo: '—',
        nota_final: null,
        situacao: null,
        acao: 'REJEITAR',
        motivo: 'Disciplina não encontrada',
      });
      continue;
    }

    const parsed = parseLancamentoFromImport(disciplina, item);
    if (parsed.error) {
      preview.push({
        discente_matricula: item.matricula,
        discente_nome: discente.nome,
        disciplina_nome: disciplina.nome,
        resumo: '—',
        nota_final: null,
        situacao: null,
        acao: 'REJEITAR',
        motivo: parsed.error,
      });
      continue;
    }

    const existing = db.prepare('SELECT id FROM notas WHERE discente_id = ? AND disciplina_id = ?').get(discente.id, disciplina.id);
    const acao = existing ? 'ATUALIZAR' : 'INCLUIR';
    const resumo = formatNotaResumo(disciplina, parsed.valores);

    preview.push({
      discente_matricula: item.matricula,
      discente_nome: discente.nome,
      disciplina_nome: disciplina.nome,
      resumo,
      nota_final: disciplina.tipo_avaliacao === 'NUMERICA' ? (parsed.valores.trabalho ?? 0) + (parsed.valores.avc ?? 0) + (parsed.valores.avf ?? 0) + (parsed.valores.trabalho_1 ?? 0) + (parsed.valores.trabalho_2 ?? 0) : null,
      situacao: parsed.valores.situacao ?? null,
      acao,
      motivo: existing ? 'Nota existente será atualizada' : undefined,
    });

    toProcess.push({ discente_id: discente.id, disciplina, valores: parsed.valores, acao });
  }

  if (!confirm) {
    return apiSuccess({
      preview,
      resumo: {
        incluir: preview.filter((p) => p.acao === 'INCLUIR').length,
        atualizar: preview.filter((p) => p.acao === 'ATUALIZAR').length,
        rejeitar: preview.filter((p) => p.acao === 'REJEITAR').length,
      },
    });
  }

  let incluidos = 0;
  let atualizados = 0;
  const tipoLancamento: TipoLancamento = auth.user.role === 'CONTROLADOR_GERAL'
    ? 'CONTROLADOR_GERAL'
    : 'CONTROLADOR_PELOTÃO';

  const transaction = db.transaction(() => {
    for (const item of toProcess) {
      try {
        const result = salvarNota(db, {
          discente_id: item.discente_id,
          disciplina_id: item.disciplina.id,
          pelotao_id: pelotaoId,
          disciplina: item.disciplina,
          valores: item.valores,
          user: auth.user,
          tipoLancamento,
          motivo: 'Importação JSON',
        });
        if (result.updated) atualizados++;
        else incluidos++;
      } catch {
        // já validado na preview
      }
    }
  });

  transaction();

  logAudit({
    user: auth.user,
    pelotao_id: pelotaoId,
    acao: 'IMPORTACAO',
    valor_novo: JSON.stringify({ incluidos, atualizados, total: data.length }),
    motivo: 'Importação de notas via JSON',
  });

  updatePelotaoUltimaAtualizacao(pelotaoId);
  return apiSuccess({ incluidos, atualizados, rejeitados: preview.filter((p) => p.acao === 'REJEITAR').length });
}
