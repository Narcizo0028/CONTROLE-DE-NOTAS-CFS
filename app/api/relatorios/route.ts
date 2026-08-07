import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, apiError, apiSuccess } from '@/lib/api-helpers';
import { calculateRanking, getDivergencias, getPelotaoUpdateStatus } from '@/lib/ranking';
import { isControladorGeral, isDiscente, canAccessPelotao, canAccessDiscente } from '@/lib/permissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get('tipo') ?? '';
  const pelotaoId = searchParams.get('pelotao_id');
  const disciplinaId = searchParams.get('disciplina_id');
  const discenteId = searchParams.get('discente_id');

  const db = getDb();

  switch (tipo) {
    case 'notas_por_pelotao': {
      if (!isControladorGeral(auth.user) && auth.user.pelotao_id !== pelotaoId) {
        return apiError('Acesso negado', 403);
      }
      const notas = db.prepare(`
        SELECT n.*, d.nome as discente_nome, d.matricula, disc.nome as disciplina_nome,
               disc.pontos_distribuidos, u.nome as lancado_por_nome, n.tipo_lancamento, n.created_at
        FROM notas n
        JOIN discentes d ON d.id = n.discente_id
        JOIN disciplinas disc ON disc.id = n.disciplina_id
        JOIN users u ON u.id = n.lancado_por_id
        WHERE d.pelotao_id = ?
        ORDER BY d.nome, disc.nome
      `).all(pelotaoId || auth.user.pelotao_id);
      return apiSuccess(notas);
    }

    case 'notas_por_discente': {
      if (!discenteId) return apiError('Discente não informado');
      const discente = db.prepare('SELECT id, pelotao_id FROM discentes WHERE id = ?').get(discenteId) as
        | { id: string; pelotao_id: string }
        | undefined;
      if (!discente) return apiError('Discente não encontrado', 404);
      if (!canAccessDiscente(auth.user, discente.pelotao_id, discente.id)) {
        return apiError('Acesso negado', 403);
      }
      const notas = db.prepare(`
        SELECT n.*, disc.nome as disciplina_nome, disc.pontos_distribuidos,
               u.nome as lancado_por_nome, n.tipo_lancamento, n.created_at, n.updated_at
        FROM notas n
        JOIN disciplinas disc ON disc.id = n.disciplina_id
        JOIN users u ON u.id = n.lancado_por_id
        WHERE n.discente_id = ?
        ORDER BY disc.nome
      `).all(discenteId);      return apiSuccess(notas);
    }

    case 'notas_por_disciplina': {
      if (!disciplinaId) return apiError('Disciplina não informada');
      if (isDiscente(auth.user)) return apiError('Acesso negado', 403);

      const notas = isControladorGeral(auth.user)
        ? db.prepare(`
        SELECT n.*, d.nome as discente_nome, d.matricula, p.nome as pelotao_nome,
               u.nome as lancado_por_nome, n.tipo_lancamento
        FROM notas n
        JOIN discentes d ON d.id = n.discente_id
        JOIN pelotoes p ON p.id = d.pelotao_id
        JOIN users u ON u.id = n.lancado_por_id
        WHERE n.disciplina_id = ?
        ORDER BY p.numero, d.nome
      `).all(disciplinaId)
        : db.prepare(`
        SELECT n.*, d.nome as discente_nome, d.matricula, p.nome as pelotao_nome,
               u.nome as lancado_por_nome, n.tipo_lancamento
        FROM notas n
        JOIN discentes d ON d.id = n.discente_id
        JOIN pelotoes p ON p.id = d.pelotao_id
        JOIN users u ON u.id = n.lancado_por_id
        WHERE n.disciplina_id = ? AND d.pelotao_id = ?
        ORDER BY d.nome
      `).all(disciplinaId, auth.user.pelotao_id);
      return apiSuccess(notas);
    }
    case 'pontos_por_pelotao': {
      if (!isControladorGeral(auth.user)) return apiError('Acesso negado', 403);
      const pelotoes = db.prepare('SELECT * FROM pelotoes ORDER BY numero').all() as { id: string; nome: string; numero: number }[];
      const result = pelotoes.map((p) => {
        const stats = db.prepare(`
          SELECT COALESCE(SUM(disc.pontos_distribuidos), 0) as distribuidos, COALESCE(SUM(n.pontos_obtidos), 0) as obtidos
          FROM notas n JOIN discentes d ON d.id = n.discente_id JOIN disciplinas disc ON disc.id = n.disciplina_id
          WHERE d.pelotao_id = ?
        `).get(p.id) as { distribuidos: number; obtidos: number };
        return { ...p, ...stats };
      });
      return apiSuccess(result);
    }

    case 'divergencias': {
      if (!isControladorGeral(auth.user)) return apiError('Acesso negado', 403);
      return apiSuccess(getDivergencias());
    }

    case 'atualizacao_pelotoes': {
      if (!isControladorGeral(auth.user)) return apiError('Acesso negado', 403);
      return apiSuccess(getPelotaoUpdateStatus());
    }

    case 'todos_discentes': {
      if (!isControladorGeral(auth.user)) return apiError('Acesso negado', 403);
      const discentes = db.prepare(`
        SELECT d.*, p.nome as pelotao_nome, p.numero as pelotao_numero,
          COALESCE(SUM(disc.pontos_distribuidos), 0) as pontos_distribuidos,
          COALESCE(SUM(n.pontos_obtidos), 0) as pontos_obtidos
        FROM discentes d
        JOIN pelotoes p ON p.id = d.pelotao_id
        LEFT JOIN notas n ON n.discente_id = d.id
        LEFT JOIN disciplinas disc ON disc.id = n.disciplina_id
        GROUP BY d.id ORDER BY p.numero, d.nome
      `).all();
      return apiSuccess(discentes);
    }

    case 'pelotao_resumo': {
      const pid = pelotaoId || auth.user.pelotao_id;
      if (!pid) return apiError('Pelotão não informado');
      if (!canAccessPelotao(auth.user, pid)) return apiError('Acesso negado', 403);
      const ranking = calculateRanking([pid]);      const notas = db.prepare(`
        SELECT n.*, d.nome as discente_nome, disc.nome as disciplina_nome,
               disc.pontos_distribuidos, u.nome as lancado_por_nome, n.tipo_lancamento, n.created_at
        FROM notas n
        JOIN discentes d ON d.id = n.discente_id
        JOIN disciplinas disc ON disc.id = n.disciplina_id
        JOIN users u ON u.id = n.lancado_por_id
        WHERE d.pelotao_id = ?
        ORDER BY n.created_at DESC
      `).all(pid);
      return apiSuccess({ ranking, notas });
    }

    case 'auditoria_notas': {
      if (isDiscente(auth.user)) return apiError('Acesso negado', 403);
      if (pelotaoId && !canAccessPelotao(auth.user, pelotaoId)) {
        return apiError('Acesso negado', 403);
      }

      const filters: Record<string, string> = {};      if (pelotaoId) filters.pelotao_id = pelotaoId;
      else if (!isControladorGeral(auth.user) && auth.user.pelotao_id) filters.pelotao_id = auth.user.pelotao_id;

      const { getAuditLogs } = await import('@/lib/audit');
      const logs = getAuditLogs({
        ...filters,
        limit: 500,
      }).filter((l) => ['LANCAMENTO', 'CORRECAO', 'EXCLUSAO', 'IMPORTACAO'].includes((l as { acao: string }).acao));

      return apiSuccess(logs);
    }

    default:
      return apiError(
        `Tipo de relatório inválido${tipo ? `: "${tipo}"` : ' (parâmetro "tipo" não informado)'}. `
        + 'Válidos: notas_por_pelotao, notas_por_discente, notas_por_disciplina, pontos_por_pelotao, '
        + 'divergencias, atualizacao_pelotoes, todos_discentes, pelotao_resumo, auditoria_notas.'
      );
  }
}
