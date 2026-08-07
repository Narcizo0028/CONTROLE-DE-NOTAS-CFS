/**
 * Bootstrap do banco antes do next start (Render).
 */
import fs from 'fs';
import path from 'path';
import { getDb, closeDb, getDataDir } from './db';
import { ensureDemoAccess } from './ensure-demo';
import { shouldEnsureDemoData } from './demo-config';

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
  console.log(`[bootstrap] RENDER=${process.env.RENDER ?? 'false'} DATABASE_DIR=${process.env.DATABASE_DIR ?? '(auto)'}`);

  getDb();
  console.log(`[bootstrap] Banco em: ${getDataDir()}`);

  if (shouldEnsureDemoData()) {
    console.log('[bootstrap] Garantindo acesso demo...');
    await ensureDemoAccess();
  } else {
    console.log('[bootstrap] Apenas schema e disciplinas oficiais.');
  }

  closeDb();
  console.log('[bootstrap] Concluído.');
}

// Sai com 0 mesmo em falha: ensureRuntimeReady() refaz a inicialização na
// primeira requisição, então o servidor deve subir de qualquer forma.
bootstrap().catch((err) => {
  console.error('[bootstrap] Falha (o servidor continuará subindo):', err);
  process.exit(0);
});
