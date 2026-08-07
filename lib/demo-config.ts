/**
 * Detecta se o seed/credenciais demo devem ser garantidos.
 * No Render, ativa por padrão (mesmo sem SEED_DEMO_DATA no painel).
 */
export function shouldEnsureDemoData(): boolean {
  if (process.env.SEED_DEMO_DATA === 'false') return false;
  if (process.env.SEED_DEMO_DATA === 'true') return true;
  // Render sem variável configurada manualmente — habilita demo por padrão
  if (process.env.RENDER) return true;
  return false;
}
