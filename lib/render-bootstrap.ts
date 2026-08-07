/**
 * Bootstrap do banco antes do next start (Render).
 * Mantido em lib/ para não depender da pasta scripts/ no GitHub.
 */
import fs from 'fs';
import path from 'path';
import { getDb, closeDb } from './db';
import { runDemoSeed } from './seed-demo';

function loadEnvFile(file: string) {
  const full = path.join(process.cwd(), file);
  if (!fs.existsSync(full)) return;
  for (const line of fs.readFileSync(full, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile('.env');
loadEnvFile('.env.local');

async function bootstrap() {
  console.log('[bootstrap] Inicializando banco de dados...');
  getDb();
  closeDb();

  if (process.env.SEED_DEMO_DATA === 'true') {
    console.log('[bootstrap] SEED_DEMO_DATA=true — verificando seed de demonstração...');
    await runDemoSeed();
  } else {
    console.log('[bootstrap] Apenas schema e disciplinas oficiais.');
    getDb();
    closeDb();
  }

  console.log('[bootstrap] Concluído.');
}

bootstrap().catch((err) => {
  console.error('[bootstrap] Falha:', err);
  process.exit(1);
});
