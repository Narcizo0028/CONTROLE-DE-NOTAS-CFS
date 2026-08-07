import { NextRequest, NextResponse } from 'next/server';
import { login, createSession } from '@/lib/auth';
import { ensureRuntimeReady } from '@/lib/runtime-ready';
import { COOKIE_NAME, SESSION_DURATION } from '@/lib/session';

export const runtime = 'nodejs';

function buildSessionCookie(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: SESSION_DURATION,
    path: '/',
  };
}

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const body = await request.json();
    const loginName = String(body.login ?? '').trim();
    const password = String(body.password ?? '');

    if (!loginName || !password) {
      return NextResponse.json({ error: 'Login e senha são obrigatórios' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const result = await login(loginName, password, ip);

    if (!result.success || !result.user) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    const token = await createSession(result.user);
    const response = NextResponse.json({
      user: {
        id: result.user.id,
        login: result.user.login,
        nome: result.user.nome,
        role: result.user.role,
      },
    });

    response.cookies.set(buildSessionCookie(token));
    return response;
  } catch (error) {
    console.error('[login]', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
