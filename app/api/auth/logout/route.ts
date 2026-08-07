import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { COOKIE_NAME } from '@/lib/session';
import { logAudit } from '@/lib/audit';

export async function POST() {
  const user = await getSession();
  if (user) {
    logAudit({ user, acao: 'LOGOUT' });
  }
  const response = NextResponse.json({ success: true });
  response.cookies.delete(COOKIE_NAME);
  return response;
}

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user });
}
