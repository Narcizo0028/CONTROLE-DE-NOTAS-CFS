import { NextRequest, NextResponse } from 'next/server';
import { login, createSession, setSessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { login: loginName, password } = await request.json();

    if (!loginName || !password) {
      return NextResponse.json({ error: 'Login e senha são obrigatórios' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const result = await login(loginName, password, ip);

    if (!result.success || !result.user) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    const token = await createSession(result.user);
    setSessionCookie(token);

    return NextResponse.json({
      user: {
        id: result.user.id,
        login: result.user.login,
        nome: result.user.nome,
        role: result.user.role,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
