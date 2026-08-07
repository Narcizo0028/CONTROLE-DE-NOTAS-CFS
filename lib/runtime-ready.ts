/**
 * Inicialização lazy — sempre garante usuários se banco vazio.
 */
let bootstrapped = false;
let bootstrapping: Promise<void> | null = null;

export async function ensureRuntimeReady() {
  if (bootstrapped) return;
  if (bootstrapping) return bootstrapping;

  bootstrapping = (async () => {
    const { getDb } = await import('./db');
    getDb();
    const { ensureDemoAccess } = await import('./ensure-demo');
    await ensureDemoAccess();
    bootstrapped = true;
  })();

  return bootstrapping;
}
