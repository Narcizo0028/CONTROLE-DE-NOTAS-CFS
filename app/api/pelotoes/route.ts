import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db';
import { requireAuth, requireRole, apiError, apiSuccess } from '@/lib/api-helpers';
import { logAudit } from '@/lib/audit';
import { isControladorGeral } from '@/lib/permissions';

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const db = getDb();
  const pelotoes = db.prepare(`
    SELECT p.*, u.nome as controlador_nome, u.login as controlador_login
    FROM pelotoes p
    LEFT JOIN users u ON u.id = p.controlador_id
    ORDER BY p.numero
  `).all();

  if (!isControladorGeral(auth.user)) {
    const filtered = pelotoes.filter((p) => (p as { id: string }).id === auth.user.pelotao_id);
    return apiSuccess(filtered);
  }

  return apiSuccess(pelotoes);
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(['CONTROLADOR_GERAL']);
  if (auth instanceof Response) return auth;

  const { numero, nome } = await request.json();
  if (!numero || !nome) return apiError('Número e nome são obrigatórios');

  const db = getDb();
  const existing = db.prepare('SELECT id FROM pelotoes WHERE numero = ?').get(numero);
  if (existing) return apiError('Já existe um pelotão com este número');

  const id = uuidv4();
  db.prepare('INSERT INTO pelotoes (id, numero, nome) VALUES (?, ?, ?)').run(id, numero, nome);

  logAudit({ user: auth.user, pelotao_id: id, acao: 'CADASTRO', valor_novo: nome, motivo: 'Cadastro de pelotão' });

  return apiSuccess({ id, numero, nome }, 201);
}
