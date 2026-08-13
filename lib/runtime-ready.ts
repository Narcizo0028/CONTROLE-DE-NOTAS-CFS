/**
 * Inicialização lazy — sempre garante usuários se banco vazio.
 */
let bootstrapped = false;
let bootstrapping: Promise<void> | null = null;

export async function ensureRuntimeReady() {
  if (bootstrapped) return;
  if (bootstrapping) return bootstrapping;

  const run = (async () => {
    try {
      const { getDb } = await import('./db');
      getDb();

      const { ensureDemoAccess } = await import('./ensure-demo');
      await ensureDemoAccess();

      // Falha ao semear não deve impedir o login de usuários já cadastrados.
      bootstrapped = true;
    } finally {
      // Libera para nova tentativa caso a abertura do banco tenha falhado.
      bootstrapping = null;
    }
  })();

  bootstrapping = run;
  return run;
}
