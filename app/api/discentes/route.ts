import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db';
import { requireAuth, requireRole, apiError, apiSuccess } from '@/lib/api-helpers';
import { logAudit } from '@/lib/audit';
import { isControladorGeral, canAccessPelotao } from '@/lib/permissions';
import { hashPassword } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const db = getDb();
  const { searchParams } = new URL(request.url);
  const pelotaoId = searchParams.get('pelotao_id');

  let query = `
    SELECT d.*, p.nome as pelotao_nome, p.numero as pelotao_numero, u.login as user_login
    FROM discentes d
    JOIN pelotoes p ON p.id = d.pelotao_id
    LEFT JOIN users u ON u.id = d.user_id
  `;
  const params: string[] = [];

  if (pelotaoId) {
    if (!canAccessPelotao(auth.user, pelotaoId) && auth.user.discente_id) {
      const discente = db.prepare('SELECT pelotao_id FROM discentes WHERE id = ?').get(auth.user.discente_id) as { pelotao_id: string } | undefined;
      if (discente?.pelotao_id !== pelotaoId) return apiError('Acesso negado', 403);
    } else if (!canAccessPelotao(auth.user, pelotaoId)) {
      return apiError('Acesso negado', 403);
    }
    query += ' WHERE d.pelotao_id = ?';
    params.push(pelotaoId);
  } else if (!isControladorGeral(auth.user)) {
    if (auth.user.pelotao_id) {
      query += ' WHERE d.pelotao_id = ?';
      params.push(auth.user.pelotao_id);
    } else if (auth.user.discente_id) {
      query += ' WHERE d.id = ?';
      params.push(auth.user.discente_id);
    }
  }

  query += ' ORDER BY d.nome';
  const discentes = db.prepare(query).all(...params);

  return apiSuccess(discentes);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const { nome, matricula, pelotao_id, criar_login, login, senha } = await request.json();

  if (!nome || !matricula || !pelotao_id) {
    return apiError('Nome, matrícula e pelotão são obrigatórios');
  }

  if (!canAccessPelotao(auth.user, pelotao_id) && !isControladorGeral(auth.user)) {
    return apiError('Acesso negado', 403);
  }

  const db = getDb();
  const pelotao = db.prepare('SELECT id FROM pelotoes WHERE id = ?').get(pelotao_id);
  if (!pelotao) return apiError('Pelotão não encontrado');
  const existing = db.prepare('SELECT id FROM discentes WHERE matricula = ?').get(matricula);
  if (existing) return apiError('Matrícula já cadastrada');

  const id = uuidv4();
  let userId: string | null = null;
  let passwordHash: string | null = null;

  if (criar_login && login && senha) {
    const existingUser = db.prepare('SELECT id FROM users WHERE login = ?').get(login);
    if (existingUser) return apiError('Login já existe');

    userId = uuidv4();
    passwordHash = await hashPassword(senha);
  }

  db.transaction(() => {
    if (userId && passwordHash) {
      db.prepare(`
        INSERT INTO users (id, login, password_hash, nome, role, pelotao_id, discente_id)
        VALUES (?, ?, ?, ?, 'DISCENTE', ?, ?)
      `).run(userId, login, passwordHash, nome, pelotao_id, id);
    }
    db.prepare(`
      INSERT INTO discentes (id, nome, matricula, pelotao_id, data_ingresso, user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, nome, matricula, pelotao_id, new Date().toISOString().slice(0, 10), userId);

    logAudit({
      user: auth.user,
      pelotao_id,
      discente_id: id,
      acao: 'CADASTRO',
      valor_novo: JSON.stringify({ nome, matricula }),
      motivo: 'Cadastro de discente',
    });
  })();

  return apiSuccess({ id, nome, matricula, pelotao_id, user_id: userId }, 201);
}
