import { SignJWT, jwtVerify } from 'jose';
import type { SessionUser, UserRole } from './types';

let cachedJwtSecret: Uint8Array | null = null;

/**
 * Sem JWT_SECRET configurado o login inteiro falhava com erro 500. Como o
 * middleware roda no Edge Runtime (sem acesso a disco), o segredo de reserva é
 * derivado de identificadores estáveis do serviço, que se mantêm iguais entre
 * reinícios e são visíveis nos dois runtimes.
 */
function resolveSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;

  const identidadeServico =
    process.env.RENDER_SERVICE_ID
    || process.env.RENDER_SERVICE_NAME
    || process.env.RENDER_EXTERNAL_URL;

  if (identidadeServico) {
    console.warn('[session] JWT_SECRET não definido. Usando segredo derivado do serviço — defina JWT_SECRET no painel do Render.');
    return `cfs-2026-notas:${identidadeServico}`;
  }

  if (process.env.NODE_ENV === 'production') {
    console.warn('[session] JWT_SECRET não definido em produção. Usando segredo padrão — defina JWT_SECRET.');
    return 'cfs-2026-notas:segredo-padrao-defina-JWT_SECRET';
  }

  return 'cfs-2026-dev-only-secret';
}

function getJwtSecret(): Uint8Array {
  if (cachedJwtSecret) return cachedJwtSecret;
  cachedJwtSecret = new TextEncoder().encode(resolveSecret());
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
