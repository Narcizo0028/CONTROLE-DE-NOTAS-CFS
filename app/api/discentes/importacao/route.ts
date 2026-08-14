import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db';
import { requireRole, apiError, apiSuccess } from '@/lib/api-helpers';
import { hashPassword } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import {
  buildDiscentesImportPreview,
  parseDiscentesImportPayload,
  type DiscenteImportItem,
} from '@/lib/discentes-import';

export async function POST(request: NextRequest) {
  const auth = await requireRole(['CONTROLADOR_GERAL']);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  const { data, confirm, pelotao_id } = body;

  if (!data) return apiError('Dados de importação inválidos');
  if (!pelotao_id || typeof pelotao_id !== 'string') return apiError('Selecione o pelotão para a importação');

  let items: DiscenteImportItem[];
  try {
    items = parseDiscentesImportPayload(data);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Formato JSON inválido');
  }

  if (items.length === 0) return apiError('Nenhum discente informado no arquivo');

  const db = getDb();
  const pelotao = db.prepare('SELECT id FROM pelotoes WHERE id = ?').get(pelotao_id);
  if (!pelotao) return apiError('Pelotão não encontrado');
  items = items.map((item) => ({ ...item, pelotao_id }));
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
      passwordHash: await hashPassword(item.senha),
    }))
  );

  const transaction = db.transaction(() => {
    for (const item of hashedItems) {
      if (item.acao === 'INCLUIR') {
        const discenteId = uuidv4();
        let userId: string | null = null;

        userId = uuidv4();
        db.prepare(`
          INSERT INTO users (id, login, password_hash, nome, role, pelotao_id, discente_id)
          VALUES (?, ?, ?, ?, 'DISCENTE', ?, ?)
        `).run(userId, item.matricula, item.passwordHash, item.nome, item.pelotao_id, discenteId);

        db.prepare(`
          INSERT INTO discentes (id, nome, matricula, pelotao_id, posto_graduacao, user_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(discenteId, item.nome, item.matricula, item.pelotao_id, item.posto_graduacao, userId);

        incluidos++;
        continue;
      }

      const existing = db.prepare('SELECT id, user_id FROM discentes WHERE matricula = ?').get(item.matricula) as
        | { id: string; user_id: string | null }
        | undefined;
      if (!existing) continue;

      db.prepare(`
        UPDATE discentes
        SET nome = ?, pelotao_id = ?, posto_graduacao = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(item.nome, item.pelotao_id, item.posto_graduacao, existing.id);

      if (!existing.user_id && item.passwordHash) {
        const userId = uuidv4();
        db.prepare(`
          INSERT INTO users (id, login, password_hash, nome, role, pelotao_id, discente_id)
          VALUES (?, ?, ?, ?, 'DISCENTE', ?, ?)
        `).run(userId, item.matricula, item.passwordHash, item.nome, item.pelotao_id, existing.id);
        db.prepare('UPDATE discentes SET user_id = ? WHERE id = ?').run(userId, existing.id);
      } else if (existing.user_id) {
        db.prepare(`
          UPDATE users
          SET nome = ?, pelotao_id = ?, password_hash = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(item.nome, item.pelotao_id, item.passwordHash, existing.user_id);
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
