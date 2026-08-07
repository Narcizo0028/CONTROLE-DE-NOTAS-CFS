import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireRole, apiError, apiSuccess } from '@/lib/api-helpers';
import { logAudit } from '@/lib/audit';
import { resetPassword, hashPassword } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(['CONTROLADOR_GERAL']);
  if (auth instanceof Response) return auth;

  const db = getDb();
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(params.id) as {
    id: string; login: string; nome: string; role: string; pelotao_id: string | null; ativo: number;
  } | undefined;

  if (!existing) return apiError('Usuário não encontrado', 404);

  const { nome, role, pelotao_id, ativo, nova_senha } = await request.json();

  const newRole = role ?? existing.role;
  if (newRole === 'CONTROLADOR_GERAL' && existing.role !== 'CONTROLADOR_GERAL') {
    const otherGeral = db.prepare("SELECT id FROM users WHERE role = 'CONTROLADOR_GERAL' AND id != ?").get(params.id);
    if (otherGeral) return apiError('Já existe um Controlador Geral cadastrado');
  }

  db.prepare(`    UPDATE users SET nome = ?, role = ?, pelotao_id = ?, ativo = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    nome ?? existing.nome,
    role ?? existing.role,
    pelotao_id ?? existing.pelotao_id,
    ativo !== undefined ? (ativo ? 1 : 0) : existing.ativo,
    params.id
  );

  if (role === 'CONTROLADOR_PELOTÃO' && pelotao_id) {
    db.prepare('UPDATE pelotoes SET controlador_id = ? WHERE id = ?').run(params.id, pelotao_id);
  }

  if (nova_senha) {
    await resetPassword(params.id, nova_senha, auth.user);
  }

  logAudit({
    user: auth.user,
    acao: 'ALTERACAO_USUARIO',
    valor_anterior: JSON.stringify(existing),
    valor_novo: JSON.stringify({ nome, role, pelotao_id, ativo }),
    motivo: 'Alteração de usuário',
  });

  return apiSuccess({ success: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(['CONTROLADOR_GERAL']);
  if (auth instanceof Response) return auth;

  if (params.id === auth.user.id) return apiError('Não é possível excluir o próprio usuário');

  const db = getDb();
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(params.id) as { login: string; role: string } | undefined;
  if (!existing) return apiError('Usuário não encontrado', 404);

  db.prepare('UPDATE users SET ativo = 0, updated_at = datetime(\'now\') WHERE id = ?').run(params.id);

  logAudit({
    user: auth.user,
    acao: 'ALTERACAO_USUARIO',
    valor_anterior: existing.login,
    motivo: 'Desativação de usuário',
  });

  return apiSuccess({ success: true });
}
