/**
 * Detecta ambiente Render e se o seed demo deve rodar.
 */
export function isRenderHost(): boolean {
  return Boolean(
    process.env.RENDER
    || process.env.RENDER_SERVICE_NAME
    || process.env.RENDER_EXTERNAL_URL
  );
}

/**
 * Controla se contas demo AUSENTES devem ser criadas quando o banco já tem usuários.
 * A criação inicial (banco vazio) acontece sempre, em ensureDemoAccess().
 * Contas já existentes nunca têm a senha sobrescrita.
 */
export function shouldEnsureDemoData(): boolean {
  if (process.env.SEED_DEMO_DATA === 'false') return false;
  if (process.env.SEED_DEMO_DATA === 'true') return true;
  return process.env.NODE_ENV !== 'production';
}

export const APP_VERSION = '1.0.11';
