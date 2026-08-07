import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db';
import { requireRole, apiError, apiSuccess } from '@/lib/api-helpers';
import { hashPassword } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import {
  buildDiscentesImportPreview,
  parseDiscentesImportPayload,
  type DiscenteImportItem,
} from '@/lib/discentes-import';

export async function POST(request: NextRequest) {
  const auth = await requireRole(['CONTROLADOR_GERAL']);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  const { data, confirm } = body;

  if (!data) return apiError('Dados de importação inválidos');

  let items: DiscenteImportItem[];
  try {
    items = parseDiscentesImportPayload(data);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Formato JSON inválido');
  }

  if (items.length === 0) return apiError('Nenhum discente informado no arquivo');

  const db = getDb();
  const { preview, toProcess } = buildDiscentesImportPreview(db, items);

  if (!confirm) {
    return apiSuccess({
      preview,
      resumo: {
        incluir: preview.filter((p) => p.acao === 'INCLUIR').length,
        atualizar: preview.filter((p) => p.acao === 'ATUALIZAR').length,
        rejeitar: preview.filter((p) => p.acao === 'REJEITAR').length,
      },
    });
  }

  let incluidos = 0;
  let atualizados = 0;

  const hashedItems = await Promise.all(
    toProcess.map(async (item) => ({
      ...item,
      passwordHash: item.criar_login ? await hashPassword(item.senha) : null,
    }))
  );

  const transaction = db.transaction(() => {
    for (const item of hashedItems) {
      if (item.acao === 'INCLUIR') {
        const discenteId = uuidv4();
        let userId: string | null = null;

        if (item.criar_login && item.passwordHash) {
          userId = uuidv4();
          db.prepare(`
            INSERT INTO users (id, login, password_hash, nome, role, pelotao_id, discente_id)
            VALUES (?, ?, ?, ?, 'DISCENTE', ?, ?)
          `).run(userId, item.login, item.passwordHash, item.nome, item.pelotao_id, discenteId);
        }

        db.prepare(`
          INSERT INTO discentes (id, nome, matricula, pelotao_id, data_ingresso, user_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(discenteId, item.nome, item.matricula, item.pelotao_id, item.data_ingresso, userId);

        incluidos++;
        continue;
      }

      const existing = db.prepare('SELECT id, user_id FROM discentes WHERE matricula = ?').get(item.matricula) as
        | { id: string; user_id: string | null }
        | undefined;
      if (!existing) continue;

      db.prepare(`
        UPDATE discentes
        SET nome = ?, pelotao_id = ?, data_ingresso = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(item.nome, item.pelotao_id, item.data_ingresso, existing.id);

      if (item.criar_login && !existing.user_id && item.passwordHash) {
        const userId = uuidv4();
        db.prepare(`
          INSERT INTO users (id, login, password_hash, nome, role, pelotao_id, discente_id)
          VALUES (?, ?, ?, ?, 'DISCENTE', ?, ?)
        `).run(userId, item.login, item.passwordHash, item.nome, item.pelotao_id, existing.id);
        db.prepare('UPDATE discentes SET user_id = ? WHERE id = ?').run(userId, existing.id);
      } else if (existing.user_id) {
        db.prepare(`
          UPDATE users
          SET nome = ?, pelotao_id = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(item.nome, item.pelotao_id, existing.user_id);
      }

      atualizados++;
    }
  });

  transaction();

  logAudit({
    user: auth.user,
    acao: 'IMPORTACAO',
    valor_novo: JSON.stringify({ incluidos, atualizados, total: items.length, tipo: 'discentes' }),
    motivo: 'Importação de discentes via JSON',
  });

  return apiSuccess({
    incluidos,
    atualizados,
    rejeitados: preview.filter((p) => p.acao === 'REJEITAR').length,
  });
}
