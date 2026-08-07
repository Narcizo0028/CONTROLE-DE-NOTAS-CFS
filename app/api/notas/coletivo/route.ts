import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, apiError, apiSuccess } from '@/lib/api-helpers';
import { canAccessPelotao } from '@/lib/permissions';
import { salvarNota } from '@/lib/notas-service';
import type { Disciplina, LancamentoNota, TipoLancamento } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const { pelotao_id, disciplina_id, notas: notasList, motivo } = await request.json();

  if (!pelotao_id || !disciplina_id || !notasList || !Array.isArray(notasList)) {
    return apiError('Pelotão, disciplina e lista de notas são obrigatórios');
  }

  if (!canAccessPelotao(auth.user, pelotao_id)) {
    return apiError('Acesso negado', 403);
  }

  const db = getDb();
  const disciplina = db.prepare('SELECT * FROM disciplinas WHERE id = ?').get(disciplina_id) as Disciplina | undefined;
  if (!disciplina) return apiError('Disciplina não encontrada', 404);

  const tipoLancamento: TipoLancamento = auth.user.role === 'CONTROLADOR_GERAL' ? 'CONTROLADOR_GERAL' : 'CONTROLADOR_PELOTÃO';
  const results = { created: 0, updated: 0, errors: [] as string[] };

  const transaction = db.transaction(() => {
    for (const item of notasList) {
      const { discente_id, ...campos } = item;
      const hasData = Object.values(campos).some((v) => v !== undefined && v !== null && v !== '');
      if (!hasData) continue;

      const discente = db.prepare('SELECT * FROM discentes WHERE id = ? AND pelotao_id = ?').get(discente_id, pelotao_id) as { id: string; nome: string } | undefined;
      if (!discente) {
        results.errors.push(`Discente ${discente_id} não encontrado no pelotão`);
        continue;
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
        const result = salvarNota(db, {
          discente_id,
          disciplina_id,
          pelotao_id,
          disciplina,
          valores,
          user: auth.user,
          tipoLancamento,
          motivo: motivo || 'Lançamento coletivo',
        });
        if (result.updated) results.updated++;
        else results.created++;
      } catch (e) {
        results.errors.push(`${discente.nome}: ${e instanceof Error ? e.message : 'Erro'}`);
      }
    }
  });

  transaction();
  return apiSuccess(results);
}
