import { NextResponse } from 'next/server';
import { ensureRuntimeReady } from '@/lib/runtime-ready';
import { getDb, getDataDir } from '@/lib/db';
import { shouldEnsureDemoData } from '@/lib/demo-config';

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
      seedDemo: shouldEnsureDemoData(),
      adminReady: Boolean(admin && admin.ativo),
      databaseDir: getDataDir(),
      render: Boolean(process.env.RENDER),
      env: {
        SEED_DEMO_DATA: process.env.SEED_DEMO_DATA ?? '(não definido)',
        DATABASE_DIR: process.env.DATABASE_DIR ?? '(não definido — usando padrão automático)',
      },
    });
  } catch (error) {
    console.error('[health]', error);
    return NextResponse.json(
      { status: 'error', service: 'CFS 2026 Notas', error: String(error) },
      { status: 500 }
    );
  }
}
