import { NextResponse } from 'next/server';
import { getSession } from './auth';
import { canAccessRoute } from './permissions';
import type { SessionUser } from './types';

export async function requireAuth(): Promise<{ user: SessionUser } | NextResponse> {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  return { user };
}

export async function requireRole(roles: string[]): Promise<{ user: SessionUser } | NextResponse> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  if (!roles.includes(result.user.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }
  return result;
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function apiSuccess(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
