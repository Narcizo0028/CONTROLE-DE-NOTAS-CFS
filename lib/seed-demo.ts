import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { getDb } from './db';

/** Cria somente acessos administrativos para uma instalação nova. */
export async function runDemoSeed() {
  const db = getDb();
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
  if (userCount.c > 0) return;

  db.prepare(`
    INSERT INTO users (id, login, password_hash, nome, role)
    VALUES (?, ?, ?, ?, 'CONTROLADOR_GERAL')
  `).run(uuidv4(), 'admin.geral', await bcrypt.hash('admin123', 12), 'Controlador Geral CFS 2026');

  for (let numero = 1; numero <= 8; numero++) {
    const pelotaoId = uuidv4();
    const controladorId = uuidv4();
    db.prepare('INSERT INTO pelotoes (id, numero, nome) VALUES (?, ?, ?)').run(pelotaoId, numero, `${numero}º Pelotão`);
    db.prepare(`
      INSERT INTO users (id, login, password_hash, nome, role, pelotao_id)
      VALUES (?, ?, ?, ?, 'CONTROLADOR_PELOTÃO', ?)
    `).run(controladorId, `ctrl.pelotao${numero}`, await bcrypt.hash(`pelotao${numero}`, 12), `Controlador ${numero}º Pelotão`, pelotaoId);
    db.prepare('UPDATE pelotoes SET controlador_id = ? WHERE id = ?').run(controladorId, pelotaoId);
  }

  console.log('Acessos administrativos iniciais criados. Nenhum discente de teste foi incluído.');
}
