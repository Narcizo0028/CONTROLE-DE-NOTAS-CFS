import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { ensureRuntimeReady } from '@/lib/runtime-ready';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  await ensureRuntimeReady();
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user });
}
