/**
 * Garante contas demo acessíveis.
 * SEMPRE cria usuários se o banco estiver vazio (independe de variáveis de ambiente).
 */
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { getDb } from './db';
import { shouldEnsureDemoData } from './demo-config';

const DEMO_ACCOUNTS = [
  { login: 'admin.geral', password: 'admin123', role: 'CONTROLADOR_GERAL' as const, nome: 'Controlador Geral CFS 2026' },
  ...Array.from({ length: 8 }, (_, i) => ({
    login: `ctrl.pelotao${i + 1}`,
    password: `pelotao${i + 1}`,
    role: 'CONTROLADOR_PELOTÃO' as const,
    nome: `Controlador ${i + 1}º Pelotão`,
    pelotaoNumero: i + 1,
  })),
];

export async function ensureDemoAccess() {
  const db = getDb();
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;

  // Banco vazio: sempre cria usuários (corrige Render sem env vars)
  if (userCount === 0) {
    console.log('[demo] Banco vazio — criando usuários demo...');
    try {
      const { runDemoSeed } = await import('./seed-demo');
      await runDemoSeed();
    } catch (error) {
      console.error('[demo] Seed completo falhou, criando apenas as contas de acesso:', error);
    }

    // Rede de segurança: sem admin.geral ninguém entra no sistema.
    const admin = db.prepare("SELECT id FROM users WHERE login = 'admin.geral'").get();
    if (!admin) await syncDemoAccounts(db);

    clearLoginAttempts(db);
    console.log('[demo] OK: admin.geral/admin123 | ctrl.pelotao1/pelotao1 | disc.2026001/discente123');
    return;
  }

  if (!shouldEnsureDemoData()) return;

  console.log(`[demo] Sincronizando credenciais demo (${userCount} usuários)...`);
  await syncDemoAccounts(db);
  clearLoginAttempts(db);
}

async function syncDemoAccounts(db: ReturnType<typeof getDb>) {
  for (let i = 1; i <= 8; i++) {
    const existing = db.prepare('SELECT id FROM pelotoes WHERE numero = ?').get(i) as { id: string } | undefined;
    if (!existing) {
      db.prepare('INSERT INTO pelotoes (id, numero, nome) VALUES (?, ?, ?)').run(uuidv4(), i, `${i}º Pelotão`);
    }
  }

  for (const account of DEMO_ACCOUNTS) {
    const hash = await bcrypt.hash(account.password, 12);
    const existing = db.prepare('SELECT id FROM users WHERE login = ?').get(account.login) as { id: string } | undefined;

    if (existing) {
      db.prepare(`
        UPDATE users SET password_hash = ?, ativo = 1, updated_at = datetime('now') WHERE login = ?
      `).run(hash, account.login);
      continue;
    }

    if (account.role === 'CONTROLADOR_GERAL') {
      db.prepare(`
        INSERT INTO users (id, login, password_hash, nome, role, ativo)
        VALUES (?, ?, ?, ?, 'CONTROLADOR_GERAL', 1)
      `).run(uuidv4(), account.login, hash, account.nome);
      continue;
    }

    if (account.role === 'CONTROLADOR_PELOTÃO' && 'pelotaoNumero' in account) {
      const pelotao = db.prepare('SELECT id FROM pelotoes WHERE numero = ?').get(account.pelotaoNumero) as { id: string } | undefined;
      if (!pelotao) continue;
      const controladorId = uuidv4();
      db.prepare(`
        INSERT INTO users (id, login, password_hash, nome, role, pelotao_id, ativo)
        VALUES (?, ?, ?, ?, 'CONTROLADOR_PELOTÃO', ?, 1)
      `).run(controladorId, account.login, hash, account.nome, pelotao.id);
      db.prepare('UPDATE pelotoes SET controlador_id = ? WHERE id = ?').run(controladorId, pelotao.id);
      continue;
    }

  }
}

function clearLoginAttempts(db: ReturnType<typeof getDb>) {
  try {
    db.prepare('DELETE FROM login_attempts').run();
  } catch {
    // ignore
  }
}
