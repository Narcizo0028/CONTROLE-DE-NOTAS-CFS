import { NextResponse } from 'next/server';
import { getSession, clearSessionCookie } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST() {
  const user = await getSession();
  if (user) {
    logAudit({ user, acao: 'LOGOUT' });
  }
  clearSessionCookie();
  return NextResponse.json({ success: true });
}

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user });
}
