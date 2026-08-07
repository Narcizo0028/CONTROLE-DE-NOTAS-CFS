import { NextResponse } from 'next/server';
import { ensureRuntimeReady } from '@/lib/runtime-ready';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensureRuntimeReady();
    const db = getDb();
    const users = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
    const admin = db.prepare("SELECT login, ativo FROM users WHERE login = 'admin.geral'").get() as
      | { login: string; ativo: number }
      | undefined;

    return NextResponse.json({
      status: 'ok',
      service: 'CFS 2026 Notas',
      users,
      seedDemo: process.env.SEED_DEMO_DATA === 'true',
      adminReady: Boolean(admin && admin.ativo),
      databaseDir: process.env.DATABASE_DIR || 'default',
    });
  } catch (error) {
    console.error('[health]', error);
    return NextResponse.json(
      { status: 'error', service: 'CFS 2026 Notas', error: String(error) },
      { status: 500 }
    );
  }
}
