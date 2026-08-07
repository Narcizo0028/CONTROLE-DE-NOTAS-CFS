/**
 * Bootstrap do banco antes do next start (Render).
 * Mantido em lib/ para não depender da pasta scripts/ no GitHub.
 */
import { getDb, closeDb } from './db';
import { runDemoSeed } from './seed-demo';

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
