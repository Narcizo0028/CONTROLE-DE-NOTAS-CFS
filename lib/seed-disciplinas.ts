import { v4 as uuidv4 } from 'uuid';
import type { DatabaseSync } from 'node:sqlite';
import { DISCIPLINAS_OFICIAIS } from './disciplinas-oficiais';

export function ensureDisciplinasOficiais(db: DatabaseSync) {
  const count = (db.prepare('SELECT COUNT(*) as c FROM disciplinas WHERE ordem > 0').get() as { c: number }).c;
  if (count === DISCIPLINAS_OFICIAIS.length) return;

  const hasNotas = (db.prepare('SELECT COUNT(*) as c FROM notas').get() as { c: number }).c;
  if (hasNotas > 0 && count > 0 && count !== DISCIPLINAS_OFICIAIS.length) {
    console.warn('[CFS 2026] Disciplinas desatualizadas detectadas. Execute npm run db:reset para recriar.');
    return;
  }

  db.exec('DELETE FROM autorizacoes_discente');
  db.exec('DELETE FROM notas');
  db.exec('DELETE FROM disciplinas');

  const insert = db.prepare(`
    INSERT INTO disciplinas (
      id, nome, carga_horaria, tipo_avaliacao, possui_avc, possui_avf, qtd_trabalhos,
      max_trabalho, max_trabalho_1, max_trabalho_2, max_avc, max_avf,
      pontos_distribuidos, participa_ranking, participa_media, ordem
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const d of DISCIPLINAS_OFICIAIS) {
    insert.run(
      uuidv4(), d.nome, d.carga_horaria, d.tipo_avaliacao,
      d.possui_avc, d.possui_avf, d.qtd_trabalhos,
      d.max_trabalho, d.max_trabalho_1, d.max_trabalho_2,
      d.max_avc, d.max_avf, d.pontos_distribuidos,
      d.participa_ranking, d.participa_media, d.ordem
    );
  }
}
