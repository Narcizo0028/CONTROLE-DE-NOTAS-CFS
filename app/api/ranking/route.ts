import { NextRequest } from 'next/server';
import { calculateRanking, getPelotaoComparison } from '@/lib/ranking';
import { requireAuth, apiError, apiSuccess } from '@/lib/api-helpers';
import { isControladorGeral, isControladorPelotao, isDiscente, canAccessPelotao } from '@/lib/permissions';
import { applyRankingPrivacy } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const pelotaoId = searchParams.get('pelotao_id');
  const pelotaoIds = searchParams.get('pelotao_ids');
  const compare = searchParams.get('compare') === 'true';

  if (compare && pelotaoIds) {
    if (!isControladorGeral(auth.user)) {
      return apiError('Acesso negado', 403);
    }
    return apiSuccess(getPelotaoComparison(pelotaoIds.split(',')));
  }

  let filterPelotaoIds: string[] | undefined;

  if (isDiscente(auth.user)) {
    if (pelotaoId && pelotaoId !== auth.user.pelotao_id) {
      return apiError('Acesso negado', 403);
    }
    filterPelotaoIds = pelotaoId ? [pelotaoId] : undefined;
  } else if (pelotaoId) {
    if (!canAccessPelotao(auth.user, pelotaoId)) {
      return apiError('Acesso negado', 403);
    }
    filterPelotaoIds = [pelotaoId];
  } else if (isControladorPelotao(auth.user) && auth.user.pelotao_id) {
    filterPelotaoIds = [auth.user.pelotao_id];
  }

  const ranking = calculateRanking(filterPelotaoIds);

  if (isDiscente(auth.user)) {
    return apiSuccess(applyRankingPrivacy(ranking, auth.user.discente_id));
  }

  return apiSuccess(ranking);
}

export async function POST() {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  let filterPelotaoIds: string[] | undefined;
  if (isControladorPelotao(auth.user) && auth.user.pelotao_id) {
    filterPelotaoIds = [auth.user.pelotao_id];
  } else if (isDiscente(auth.user) && auth.user.pelotao_id) {
    filterPelotaoIds = [auth.user.pelotao_id];
  }

  const ranking = calculateRanking(filterPelotaoIds);
  const result = isDiscente(auth.user)
    ? applyRankingPrivacy(ranking, auth.user.discente_id)
    : ranking;

  return apiSuccess({ ranking: result, updated_at: new Date().toISOString() });
}
