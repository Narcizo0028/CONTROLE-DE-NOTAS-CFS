/**
 * Inicialização lazy (serverless) e garantia de seed/credenciais demo.
 */
let bootstrapped = false;
let bootstrapping: Promise<void> | null = null;

export async function ensureRuntimeReady() {
  if (bootstrapped) return;
  if (bootstrapping) return bootstrapping;

  bootstrapping = (async () => {
    const { getDb } = await import('./db');
    getDb();

    if (process.env.SEED_DEMO_DATA === 'true') {
      const { ensureDemoAccess } = await import('./ensure-demo');
      await ensureDemoAccess();
    }

    bootstrapped = true;
  })();

  return bootstrapping;
}
