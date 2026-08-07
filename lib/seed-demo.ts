import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { getDb, closeDb } from './db';
import { prepararNotaParaSalvar } from './avaliacao';
import type { Disciplina } from './types';

export async function runDemoSeed() {
  const db = getDb();

  console.log('Inicializando banco de dados CFS 2026...');

  const existingGeral = db.prepare("SELECT id FROM users WHERE role = 'CONTROLADOR_GERAL'").get();
  if (existingGeral) {
    console.log('Banco já possui dados de usuários. Pulando seed de usuários/discentes.');
    console.log('Disciplinas oficiais verificadas na inicialização.');
    closeDb();
    return;
  }

  const hash = await bcrypt.hash('admin123', 12);
  const geralId = uuidv4();

  db.prepare(`
    INSERT INTO users (id, login, password_hash, nome, role)
    VALUES (?, ?, ?, ?, 'CONTROLADOR_GERAL')
  `).run(geralId, 'admin.geral', hash, 'Controlador Geral CFS 2026');

  const pelotaoIds: string[] = [];
  const controladorIds: string[] = [];

  for (let i = 1; i <= 8; i++) {
    const pelotaoId = uuidv4();
    const controladorId = uuidv4();
    const ctrlHash = await bcrypt.hash(`pelotao${i}`, 12);

    db.prepare('INSERT INTO pelotoes (id, numero, nome) VALUES (?, ?, ?)').run(pelotaoId, i, `${i}º Pelotão`);

    db.prepare(`
      INSERT INTO users (id, login, password_hash, nome, role, pelotao_id)
      VALUES (?, ?, ?, ?, 'CONTROLADOR_PELOTÃO', ?)
    `).run(controladorId, `ctrl.pelotao${i}`, ctrlHash, `Controlador ${i}º Pelotão`, pelotaoId);

    db.prepare('UPDATE pelotoes SET controlador_id = ? WHERE id = ?').run(controladorId, pelotaoId);

    pelotaoIds.push(pelotaoId);
    controladorIds.push(controladorId);
  }

  const allDisciplinas = db.prepare('SELECT * FROM disciplinas ORDER BY ordem').all() as unknown as Disciplina[];
  console.log(`${allDisciplinas.length} disciplinas oficiais carregadas.`);

  const nomes = [
    'João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa', 'Carlos Ferreira',
    'Lucia Almeida', 'Roberto Lima', 'Fernanda Rocha', 'Marcos Pereira', 'Juliana Martins',
  ];

  let matriculaCounter = 2026001;

  const insertNota = db.prepare(`
    INSERT INTO notas (
      id, discente_id, disciplina_id, trabalho, trabalho_1, trabalho_2, avc, avf,
      situacao, nota_final, pontos_obtidos, lancado_por_id, tipo_lancamento
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let p = 0; p < pelotaoIds.length; p++) {
    const pelotaoId = pelotaoIds[p];
    const controladorId = controladorIds[p];
    const numDiscentes = 10 + (p % 3);

    for (let d = 0; d < numDiscentes; d++) {
      const discenteId = uuidv4();
      const userId = uuidv4();
      const matricula = String(matriculaCounter++);
      const nome = nomes[d % nomes.length] + ` P${p + 1}`;
      const discHash = await bcrypt.hash('discente123', 12);
      const dataIngresso = `2026-0${(d % 3) + 1}-${String(10 + d).padStart(2, '0')}`;

      db.prepare(`
        INSERT INTO users (id, login, password_hash, nome, role, pelotao_id, discente_id)
        VALUES (?, ?, ?, ?, 'DISCENTE', ?, ?)
      `).run(userId, `disc.${matricula}`, discHash, nome, pelotaoId, discenteId);

      db.prepare(`
        INSERT INTO discentes (id, nome, matricula, pelotao_id, data_ingresso, user_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(discenteId, nome, matricula, pelotaoId, dataIngresso, userId);

      const numNotas = 4 + Math.floor(Math.random() * 4);
      for (let n = 0; n < numNotas; n++) {
        const disc = allDisciplinas[n % allDisciplinas.length];
        let valores;

        if (disc.tipo_avaliacao === 'APTO_INAPTO') {
          valores = { situacao: (Math.random() > 0.15 ? 'APTO' : 'INAPTO') as 'APTO' | 'INAPTO' };
        } else if (disc.qtd_trabalhos === 2) {
          valores = {
            trabalho_1: Math.floor(disc.max_trabalho_1 * (0.7 + Math.random() * 0.3)),
            trabalho_2: Math.floor(disc.max_trabalho_2 * (0.7 + Math.random() * 0.3)),
            avf: Math.floor(disc.max_avf * (0.6 + Math.random() * 0.35)),
          };
        } else {
          valores = {
            trabalho: Math.floor(disc.max_trabalho * (0.7 + Math.random() * 0.3)),
            ...(disc.possui_avc ? { avc: Math.floor(disc.max_avc * (0.6 + Math.random() * 0.35)) } : {}),
            ...(disc.possui_avf ? { avf: Math.floor(disc.max_avf * (0.6 + Math.random() * 0.35)) } : {}),
          };
        }

        const dados = prepararNotaParaSalvar(disc, valores);
        insertNota.run(
          uuidv4(), discenteId, disc.id,
          dados.trabalho, dados.trabalho_1, dados.trabalho_2, dados.avc, dados.avf,
          dados.situacao, dados.nota_final, dados.pontos_obtidos,
          n % 3 === 0 ? userId : controladorId,
          n % 3 === 0 ? 'DISCENTE' : 'CONTROLADOR_PELOTÃO'
        );
      }
    }

    const discAutorizada = allDisciplinas.find((x) => x.tipo_avaliacao === 'NUMERICA' && x.participa_ranking);
    if (p < 3 && discAutorizada) {
      db.prepare(`
        INSERT INTO autorizacoes_discente (id, pelotao_id, disciplina_id, status)
        VALUES (?, ?, ?, 'ATIVA')
      `).run(uuidv4(), pelotaoId, discAutorizada.id);
    }

    db.prepare(`UPDATE pelotoes SET ultima_atualizacao = datetime('now', '-${p} days') WHERE id = ?`).run(pelotaoId);
  }

  console.log('Seed concluído!');
  console.log('Controlador Geral: admin.geral / admin123');
  console.log('Controlador Pelotão 1: ctrl.pelotao1 / pelotao1');
  console.log('Discente: disc.2026001 / discente123');

  closeDb();
}
