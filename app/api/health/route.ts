import { NextResponse } from 'next/server';
import { ensureRuntimeReady } from '@/lib/runtime-ready';

export const runtime = 'nodejs';

export async function GET() {
  await ensureRuntimeReady();
  return NextResponse.json({ status: 'ok', service: 'CFS 2026 Notas' });
}
