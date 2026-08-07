import { NextResponse } from 'next/server';
import { ensureRuntimeReady } from '@/lib/runtime-ready';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensureRuntimeReady();
    return NextResponse.json({ status: 'ok', service: 'CFS 2026 Notas' });
  } catch (error) {
    console.error('[health]', error);
    return NextResponse.json(
      { status: 'error', service: 'CFS 2026 Notas', error: String(error) },
      { status: 500 }
    );
  }
}
