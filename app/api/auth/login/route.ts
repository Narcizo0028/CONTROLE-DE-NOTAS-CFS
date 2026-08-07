import { NextRequest, NextResponse } from 'next/server';
import { login, createSession } from '@/lib/auth';
import { ensureRuntimeReady } from '@/lib/runtime-ready';
import { COOKIE_NAME, SESSION_DURATION } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isHttps(request: NextRequest) {
  const proto = request.headers.get('x-forwarded-proto');
  if (proto) return proto.split(',')[0].trim() === 'https';
  return process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER);
}

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const body = await request.json();
    const loginName = String(body.login ?? '').trim().toLowerCase();
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

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isHttps(request),
      sameSite: 'lax',
      maxAge: SESSION_DURATION,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[login]', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', detail: process.env.NODE_ENV === 'production' ? undefined : String(error) },
      { status: 500 }
    );
  }
}
