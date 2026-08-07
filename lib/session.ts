import { SignJWT, jwtVerify } from 'jose';
import type { SessionUser, UserRole } from './types';

let cachedJwtSecret: Uint8Array | null = null;

function getJwtSecret(): Uint8Array {
  if (cachedJwtSecret) return cachedJwtSecret;
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET deve estar definido em produção');
  }
  cachedJwtSecret = new TextEncoder().encode(secret || 'cfs-2026-dev-only-secret');
  return cachedJwtSecret;
}
export const COOKIE_NAME = 'cfs_session';
export const SESSION_DURATION = 60 * 60 * 8;

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    login: user.login,
    nome: user.nome,
    role: user.role,
    pelotao_id: user.pelotao_id,
    discente_id: user.discente_id,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${SESSION_DURATION}s`)
    .setIssuedAt()
    .sign(getJwtSecret());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return {
      id: payload.id as string,
      login: payload.login as string,
      nome: payload.nome as string,
      role: payload.role as UserRole,
      pelotao_id: (payload.pelotao_id as string) || null,
      discente_id: (payload.discente_id as string) || null,
    };
  } catch {
    return null;
  }
}
