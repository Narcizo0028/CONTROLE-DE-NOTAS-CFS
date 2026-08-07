import { NextRequest, NextResponse } from 'next/server';
import { getSession, changePassword } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { currentPassword, newPassword } = await request.json();

  const result = await changePassword(user.id, currentPassword, newPassword);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  logAudit({ user, acao: 'REDEFINICAO_SENHA', motivo: 'Alteração de senha pelo próprio usuário' });

  return NextResponse.json({ success: true });
}
