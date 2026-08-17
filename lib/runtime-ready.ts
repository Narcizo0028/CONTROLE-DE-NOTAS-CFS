/**
 * Inicialização lazy — sempre garante usuários se banco vazio.
 *
 * O estado fica em globalThis porque, no `next dev`, cada rota de API é um
 * bundle separado: variáveis de módulo NÃO são compartilhadas entre páginas.
 */
type RuntimeReadyState = {
  bootstrapped: boolean;
  bootstrapping: Promise<void> | null;
};

const runtimeState = (globalThis as typeof globalThis & {
  __cfsRuntimeReady?: RuntimeReadyState;
});

function getRuntimeState(): RuntimeReadyState {
  if (!runtimeState.__cfsRuntimeReady) {
    runtimeState.__cfsRuntimeReady = { bootstrapped: false, bootstrapping: null };
  }
  return runtimeState.__cfsRuntimeReady;
}

export async function ensureRuntimeReady() {
  const state = getRuntimeState();
  if (state.bootstrapped) return;
  if (state.bootstrapping) return state.bootstrapping;

  const run = (async () => {
    try {
      const { getDb } = await import('./db');
      getDb();

      const { ensureDemoAccess } = await import('./ensure-demo');
      await ensureDemoAccess();

      // Falha ao semear não deve impedir o login de usuários já cadastrados.
      state.bootstrapped = true;
    } finally {
      // Libera para nova tentativa caso a abertura do banco tenha falhado.
      state.bootstrapping = null;
    }
  })();

  state.bootstrapping = run;
  return run;
}
