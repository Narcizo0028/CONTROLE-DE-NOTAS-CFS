/**
 * Inicialização lazy (serverless) e garantia de seed quando o banco está vazio.
 */
let bootstrapped = false;
let bootstrapping: Promise<void> | null = null;

export async function ensureRuntimeReady() {
  if (bootstrapped) return;
  if (bootstrapping) return bootstrapping;

  bootstrapping = (async () => {
    const { getDb } = await import('./db');
    const db = getDb();

    const shouldSeed = process.env.SEED_DEMO_DATA === 'true';
    const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };

    if (shouldSeed && userCount.c === 0) {
      const { runDemoSeed } = await import('./seed-demo');
      await runDemoSeed();
    }

    bootstrapped = true;
  })();

  return bootstrapping;
}
