import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db';
import { requireRole, apiError, apiSuccess } from '@/lib/api-helpers';
import { logAudit } from '@/lib/audit';
import { hashPassword, resetPassword } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireRole(['CONTROLADOR_GERAL']);
  if (auth instanceof Response) return auth;

  const db = getDb();
  const users = db.prepare(`
    SELECT u.id, u.login, u.nome, u.role, u.pelotao_id, u.discente_id, u.ativo, u.created_at,
           p.nome as pelotao_nome, p.numero as pelotao_numero
    FROM users u
    LEFT JOIN pelotoes p ON p.id = u.pelotao_id
    ORDER BY u.role, u.nome
  `).all();

  return apiSuccess(users);
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(['CONTROLADOR_GERAL']);
  if (auth instanceof Response) return auth;

  const { login, nome, password, role, pelotao_id } = await request.json();

  if (!login || !nome || !password || !role) {
    return apiError('Login, nome, senha e perfil são obrigatórios');
  }

  if (role === 'CONTROLADOR_PELOTÃO' && !pelotao_id) {
    return apiError('Pelotão é obrigatório para controlador de pelotão');
  }

  if (role === 'CONTROLADOR_GERAL') {
    const existing = getDb().prepare("SELECT id FROM users WHERE role = 'CONTROLADOR_GERAL'").get();
    if (existing) return apiError('Já existe um Controlador Geral cadastrado');
  }

  const db = getDb();
  const existingLogin = db.prepare('SELECT id FROM users WHERE login = ?').get(login);
  if (existingLogin) return apiError('Login já existe');

  const id = uuidv4();
  const passwordHash = await hashPassword(password);

  db.prepare(`
    INSERT INTO users (id, login, password_hash, nome, role, pelotao_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, login, passwordHash, nome, role, pelotao_id || null);

  if (role === 'CONTROLADOR_PELOTÃO' && pelotao_id) {
    db.prepare('UPDATE pelotoes SET controlador_id = ? WHERE id = ?').run(id, pelotao_id);
  }

  logAudit({
    user: auth.user,
    pelotao_id: pelotao_id || null,
    acao: 'CADASTRO',
    valor_novo: JSON.stringify({ login, nome, role }),
    motivo: 'Cadastro de usuário',
  });

  return apiSuccess({ id, login, nome, role }, 201);
}
