import { closeDb, getDb } from '../lib/db';

const db = getDb();

const discentes = db.prepare('SELECT id, user_id FROM discentes').all() as { id: string; user_id: string | null }[];

const remover = db.transaction(() => {
  for (const discente of discentes) {
    db.prepare('DELETE FROM notas WHERE discente_id = ?').run(discente.id);
    db.prepare('DELETE FROM discentes WHERE id = ?').run(discente.id);
    if (discente.user_id) db.prepare('DELETE FROM users WHERE id = ?').run(discente.user_id);
  }
});

remover();
const remaining = db.prepare('SELECT COUNT(*) AS total FROM discentes').get() as { total: number };
console.log(`${discentes.length} discente(s) removido(s). Restantes: ${remaining.total}.`);
closeDb();
