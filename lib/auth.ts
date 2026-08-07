import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { getDb } from './db';
import { logAudit, logLoginAttempt } from './audit';
import { createSessionToken, verifySession, COOKIE_NAME, SESSION_DURATION } from './session';
import type { SessionUser, User, UserRole } from './types';

export { verifySession } from './session';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: SessionUser): Promise<string> {
  return createSessionToken(user);
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await verifySession(token);
  if (!session) return null;

  const db = getDb();
  const user = db.prepare(`
    SELECT id, login, nome, role, pelotao_id, discente_id
    FROM users WHERE id = ? AND ativo = 1
  `).get(session.id) as SessionUser | undefined;

  if (!user) return null;

  return {
    id: user.id,
    login: user.login,
    nome: user.nome,
    role: user.role,
    pelotao_id: user.pelotao_id,
    discente_id: user.discente_id,
  };
}

export function setSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION,
    path: '/',
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

export async function login(loginName: string, password: string, ip?: string): Promise<{ success: boolean; user?: SessionUser; error?: string }> {
  // Idempotente e cacheado: evita re-hashear as contas demo a cada tentativa
  // (o que também zerava o controle de tentativas a cada login).
  try {
    const { ensureRuntimeReady } = await import('./runtime-ready');
    await ensureRuntimeReady();
  } catch (error) {
    console.error('[login] Falha na inicialização do banco:', error);
  }

  const db = getDb();
  const normalizedLogin = loginName.trim().toLowerCase();
  const normalizedPassword = password;

  const recentFailures = db.prepare(`
    SELECT COUNT(*) as c FROM login_attempts
    WHERE login = ? AND success = 0
      AND datetime(created_at) > datetime('now', '-15 minutes')
  `).get(normalizedLogin) as { c: number };

  if (recentFailures.c >= 5) {
    return { success: false, error: 'Muitas tentativas. Aguarde 15 minutos e tente novamente.' };
  }

  const user = db.prepare('SELECT * FROM users WHERE login = ? AND ativo = 1').get(normalizedLogin) as User | undefined;
  if (!user) {
    logLoginAttempt(normalizedLogin, false, ip);
    logAudit({ acao: 'LOGIN_FALHA', motivo: `Login falhou: ${normalizedLogin}`, ip_address: ip });
    return { success: false, error: 'Login ou senha inválidos' };
  }

  const valid = await verifyPassword(normalizedPassword, user.password_hash ?? '');
  if (!valid) {
    logLoginAttempt(normalizedLogin, false, ip);
    logAudit({
      user: { id: user.id, login: user.login, nome: user.nome, role: user.role, pelotao_id: user.pelotao_id, discente_id: user.discente_id },
      acao: 'LOGIN_FALHA',
      motivo: 'Senha incorreta',
      ip_address: ip,
    });
    return { success: false, error: 'Login ou senha inválidos' };
  }

  logLoginAttempt(normalizedLogin, true, ip);

  const sessionUser: SessionUser = {
    id: user.id,
    login: user.login,
    nome: user.nome,
    role: user.role,
    pelotao_id: user.pelotao_id,
    discente_id: user.discente_id,
  };

  logAudit({ user: sessionUser, acao: 'LOGIN', ip_address: ip });

  return { success: true, user: sessionUser };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User | undefined;

  if (!user) return { success: false, error: 'Usuário não encontrado' };

  const valid = await verifyPassword(currentPassword, user.password_hash ?? '');
  if (!valid) return { success: false, error: 'Senha atual incorreta' };

  if (newPassword.length < 6) return { success: false, error: 'A nova senha deve ter no mínimo 6 caracteres' };

  const hash = await hashPassword(newPassword);
  db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(hash, userId);

  return { success: true };
}

export async function resetPassword(userId: string, newPassword: string, adminUser: SessionUser): Promise<{ success: boolean; error?: string }> {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User | undefined;
  if (!user) return { success: false, error: 'Usuário não encontrado' };

  if (newPassword.length < 6) return { success: false, error: 'A senha deve ter no mínimo 6 caracteres' };

  const hash = await hashPassword(newPassword);
  db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(hash, userId);

  logAudit({
    user: adminUser,
    acao: 'REDEFINICAO_SENHA',
    valor_anterior: user.login,
    motivo: `Senha redefinida para ${user.login}`,
  });

  return { success: true };
}
