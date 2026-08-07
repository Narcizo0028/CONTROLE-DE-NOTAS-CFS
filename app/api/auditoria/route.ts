import { NextRequest } from 'next/server';
import { getAuditLogs, getAuditCount } from '@/lib/audit';
import { requireRole, apiError, apiSuccess } from '@/lib/api-helpers';
import { isControladorGeral, canAccessPelotao } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  const auth = await requireRole(['CONTROLADOR_GERAL', 'CONTROLADOR_PELOTÃO']);
  if (auth instanceof Response) return auth;
  const { searchParams } = new URL(request.url);
  const pelotaoId = searchParams.get('pelotao_id');
  const discenteId = searchParams.get('discente_id');
  const disciplinaId = searchParams.get('disciplina_id');
  const acao = searchParams.get('acao');
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = parseInt(searchParams.get('offset') || '0');

  if (!isControladorGeral(auth.user) && pelotaoId && pelotaoId !== auth.user.pelotao_id) {
    return apiError('Acesso negado', 403);
  }
  if (pelotaoId && !canAccessPelotao(auth.user, pelotaoId)) {
    return apiError('Acesso negado', 403);
  }
  const filters: Record<string, string | number> = { limit, offset };
  if (pelotaoId) filters.pelotao_id = pelotaoId;
  else if (!isControladorGeral(auth.user) && auth.user.pelotao_id) filters.pelotao_id = auth.user.pelotao_id;
  if (discenteId) filters.discente_id = discenteId;
  if (disciplinaId) filters.disciplina_id = disciplinaId;
  if (acao) filters.acao = acao;

  const logs = getAuditLogs(filters);
  const total = getAuditCount({ pelotao_id: filters.pelotao_id as string | undefined });

  return apiSuccess({ logs, total });
}
