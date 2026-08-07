/**
 * Inicialização lazy na Vercel/Netlify (serverless) e outros hosts sem start:render.
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
      const { runDemoSeed } = await import('./seed-demo');
      await runDemoSeed();
    }

    bootstrapped = true;
  })();

  return bootstrapping;
}
