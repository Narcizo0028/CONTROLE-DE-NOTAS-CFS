import { getDb, closeDb } from '../lib/db';
import { runDemoSeed } from '../lib/seed-demo';

async function bootstrap() {
  console.log('[bootstrap] Inicializando banco de dados...');
  getDb();
  closeDb();

  if (process.env.SEED_DEMO_DATA === 'true') {
    await runDemoSeed();
  } else {
    getDb();
    closeDb();
  }

  console.log('[bootstrap] Concluído.');
}

bootstrap().catch((err) => {
  console.error('[bootstrap] Falha:', err);
  process.exit(1);
});
