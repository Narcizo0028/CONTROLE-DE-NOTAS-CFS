import { getDb } from './db';
import type { RankingEntry } from './types';

interface DiscenteStats {
  discente_id: string;
  nome: string;
  pelotao_id: string;
  pelotao_nome: string;
  pelotao_numero: number;
  data_ingresso: string;
  pontos_distribuidos: number;
  pontos_obtidos: number;
  percentual: number;
}

function getDiscenteStats(pelotaoIds?: string[]): DiscenteStats[] {
  const db = getDb();
  const totalDistribuidos = (db.prepare(`
    SELECT COALESCE(SUM(pontos_distribuidos), 0) as total
    FROM disciplinas WHERE participa_ranking = 1 AND participa_media = 1
  `).get() as { total: number }).total;

  let query = `
    SELECT 
      d.id as discente_id,
      d.nome,
      d.pelotao_id,
      p.nome as pelotao_nome,
      p.numero as pelotao_numero,
      d.data_ingresso,
      ? as pontos_distribuidos,
      COALESCE(SUM(CASE WHEN disc.id IS NOT NULL THEN COALESCE(n.nota_final, n.pontos_obtidos) ELSE 0 END), 0) as pontos_obtidos
    FROM discentes d
    JOIN pelotoes p ON p.id = d.pelotao_id
    LEFT JOIN notas n ON n.discente_id = d.id
    LEFT JOIN disciplinas disc ON disc.id = n.disciplina_id AND disc.participa_ranking = 1 AND disc.participa_media = 1
  `;

  const params: (string | number)[] = [totalDistribuidos];
  if (pelotaoIds && pelotaoIds.length > 0) {
    query += ` WHERE d.pelotao_id IN (${pelotaoIds.map(() => '?').join(',')})`;
    params.push(...pelotaoIds);
  }

  query += ` GROUP BY d.id ORDER BY d.nome`;

  const rows = db.prepare(query).all(...params) as unknown as DiscenteStats[];

  return rows.map((row) => ({
    ...row,
    percentual: row.pontos_distribuidos > 0
      ? (row.pontos_obtidos / row.pontos_distribuidos) * 100
      : 0,
  }));
}

function sortRanking(stats: DiscenteStats[]): DiscenteStats[] {
  return [...stats].sort((a, b) => {
    if (b.percentual !== a.percentual) return b.percentual - a.percentual;
    if (b.pontos_obtidos !== a.pontos_obtidos) return b.pontos_obtidos - a.pontos_obtidos;
    if (b.pontos_distribuidos !== a.pontos_distribuidos) return b.pontos_distribuidos - a.pontos_distribuidos;
    return new Date(a.data_ingresso).getTime() - new Date(b.data_ingresso).getTime();
  });
}

export function calculateRanking(pelotaoIds?: string[]): RankingEntry[] {
  const stats = getDiscenteStats(pelotaoIds);
  const sorted = sortRanking(stats);

  return sorted.map((s, index) => ({
    posicao: index + 1,
    discente_id: s.discente_id,
    nome: s.nome,
    pelotao_id: s.pelotao_id,
    pelotao_nome: s.pelotao_nome,
    pelotao_numero: s.pelotao_numero,
    pontos_distribuidos: s.pontos_distribuidos,
    pontos_obtidos: s.pontos_obtidos,
    percentual: s.percentual,
    data_ingresso: s.data_ingresso,
  }));
}

export function getDiscenteRanking(discenteId: string, pelotaoIds?: string[]): RankingEntry | null {
  const ranking = calculateRanking(pelotaoIds);
  return ranking.find((r) => r.discente_id === discenteId) ?? null;
}

export function getPelotaoRankingStats(pelotaoId: string) {
  const ranking = calculateRanking([pelotaoId]);
  return {
    ranking: ranking.slice(0, 10),
    total: ranking.length,
    mediaPercentual: ranking.length > 0
      ? ranking.reduce((sum, r) => sum + r.percentual, 0) / ranking.length
      : 0,
  };
}

export function getPelotaoComparison(pelotaoIds: string[]) {
  const db = getDb();
  const results = pelotaoIds.map((pid) => {
    const pelotao = db.prepare('SELECT * FROM pelotoes WHERE id = ?').get(pid) as { id: string; nome: string; numero: number };
    const ranking = calculateRanking([pid]);
    const totalPontosDistribuidos = ranking.reduce((s, r) => s + r.pontos_distribuidos, 0);
    const totalPontosObtidos = ranking.reduce((s, r) => s + r.pontos_obtidos, 0);
    const mediaPercentual = ranking.length > 0
      ? ranking.reduce((s, r) => s + r.percentual, 0) / ranking.length
      : 0;

    return {
      pelotao_id: pid,
      pelotao_nome: pelotao?.nome ?? '',
      pelotao_numero: pelotao?.numero ?? 0,
      total_discentes: ranking.length,
      total_pontos_distribuidos: totalPontosDistribuidos,
      total_pontos_obtidos: totalPontosObtidos,
      media_percentual: mediaPercentual,
      top3: ranking.slice(0, 3),
    };
  });

  return results.sort((a, b) => b.media_percentual - a.media_percentual);
}

export function getDivergencias() {
  const db = getDb();
  const pelotoes = db.prepare('SELECT * FROM pelotoes ORDER BY numero').all() as unknown as { id: string; nome: string; numero: number }[];

  const pelotaoStats = pelotoes.map((p) => {
    const discentes = db.prepare(`
      SELECT d.id, d.nome,
        COALESCE(SUM(CASE WHEN disc.participa_ranking = 1 THEN disc.pontos_distribuidos ELSE 0 END), 0) as pontos_distribuidos
      FROM discentes d
      LEFT JOIN notas n ON n.discente_id = d.id
      LEFT JOIN disciplinas disc ON disc.id = n.disciplina_id AND disc.participa_ranking = 1
      WHERE d.pelotao_id = ?
      GROUP BY d.id
    `).all(p.id) as unknown as { id: string; nome: string; pontos_distribuidos: number }[];

    const pontosValues = discentes.map((d) => d.pontos_distribuidos);
    const uniquePontos = Array.from(new Set(pontosValues));
    const mode = [...pontosValues].sort((a, b) =>
      pontosValues.filter((v) => v === a).length - pontosValues.filter((v) => v === b).length
    ).pop();

    return {
      pelotao_id: p.id,
      pelotao_nome: p.nome,
      pelotao_numero: p.numero,
      total_discentes: discentes.length,
      pontos_por_discente: pontosValues,
      media_pontos: pontosValues.length > 0 ? pontosValues.reduce((a, b) => a + b, 0) / pontosValues.length : 0,
      tem_divergencia: uniquePontos.length > 1,
      discentes_divergentes: discentes.filter((d) => d.pontos_distribuidos !== mode),
    };
  });

  const disciplinasPorPelotao = pelotoes.map((p) => {
    const disciplinas = db.prepare(`
      SELECT DISTINCT disc.id, disc.nome
      FROM notas n
      JOIN discentes d ON d.id = n.discente_id
      JOIN disciplinas disc ON disc.id = n.disciplina_id
      WHERE d.pelotao_id = ?
    `).all(p.id) as unknown as { id: string; nome: string }[];
    return { pelotao_id: p.id, disciplinas };
  });

  const allDisciplinaIds = new Set(disciplinasPorPelotao.flatMap((dp) => dp.disciplinas.map((d) => d.id)));
  const disciplinasFaltantes: { disciplina: string; pelotao_com: string; pelotao_sem: string }[] = [];

  Array.from(allDisciplinaIds).forEach((discId) => {
    const pelotoesCom = disciplinasPorPelotao.filter((dp) => dp.disciplinas.some((d) => d.id === discId));
    const pelotoesSem = disciplinasPorPelotao.filter((dp) => !dp.disciplinas.some((d) => d.id === discId));
    if (pelotoesCom.length > 0 && pelotoesSem.length > 0) {
      const discNome = pelotoesCom[0].disciplinas.find((d) => d.id === discId)?.nome ?? '';
      for (const sem of pelotoesSem) {
        const pelotaoSem = pelotoes.find((p) => p.id === sem.pelotao_id);
        const pelotaoCom = pelotoes.find((p) => p.id === pelotoesCom[0].pelotao_id);
        disciplinasFaltantes.push({
          disciplina: discNome,
          pelotao_com: pelotaoCom?.nome ?? '',
          pelotao_sem: pelotaoSem?.nome ?? '',
        });
      }
    }
  });

  return { pelotaoStats, disciplinasFaltantes };
}

export function getPelotaoUpdateStatus() {
  const db = getDb();
  const pelotoes = db.prepare('SELECT * FROM pelotoes ORDER BY numero').all() as unknown as {
    id: string; nome: string; numero: number; ultima_atualizacao: string | null;
  }[];

  return pelotoes.map((p) => {
    const totalDiscentes = (db.prepare('SELECT COUNT(*) as c FROM discentes WHERE pelotao_id = ?').get(p.id) as { c: number }).c;
    const totalDisciplinas = (db.prepare('SELECT COUNT(*) as c FROM disciplinas').get() as { c: number }).c;
    const notasLancadas = (db.prepare(`
      SELECT COUNT(DISTINCT n.disciplina_id) as c FROM notas n
      JOIN discentes d ON d.id = n.discente_id WHERE d.pelotao_id = ?
    `).get(p.id) as { c: number }).c;

    const percentual = totalDisciplinas > 0 ? (notasLancadas / totalDisciplinas) * 100 : 0;

    return {
      ...p,
      total_discentes: totalDiscentes,
      total_disciplinas: totalDisciplinas,
      notas_lancadas: notasLancadas,
      percentual_atualizacao: percentual,
    };
  });
}
