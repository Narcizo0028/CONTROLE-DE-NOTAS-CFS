import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { getDb, getDataDir } from '@/lib/db';
import { requireRole, apiSuccess, apiError } from '@/lib/api-helpers';
import { logAudit } from '@/lib/audit';

function getBackupDir() {
  return path.join(getDataDir(), 'backups');
}

export async function GET() {
  const auth = await requireRole(['CONTROLADOR_GERAL']);
  if (auth instanceof Response) return auth;

  const db = getDb();
  const backups = db.prepare(`
    SELECT b.*, u.nome as created_by_nome
    FROM backups b
    LEFT JOIN users u ON u.id = b.created_by
    ORDER BY b.created_at DESC
  `).all();

  return apiSuccess(backups);
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(['CONTROLADOR_GERAL']);
  if (auth instanceof Response) return auth;

  const { action, backup_id } = await request.json();
  const BACKUP_DIR = getBackupDir();
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  if (action === 'create') {
    const db = getDb();
    const tables = ['pelotoes', 'users', 'discentes', 'disciplinas', 'notas', 'autorizacoes_discente', 'audit_log'];
    const data: Record<string, unknown[]> = {};

    for (const table of tables) {
      data[table] = db.prepare(`SELECT * FROM ${table}`).all();
    }

    const filename = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(BACKUP_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));

    const id = uuidv4();
    db.prepare(`INSERT INTO backups (id, filename, created_by, tipo, descricao) VALUES (?, ?, ?, 'MANUAL', ?)`).run(
      id, filename, auth.user.id, 'Backup manual'
    );

    logAudit({ user: auth.user, acao: 'BACKUP', valor_novo: filename, motivo: 'Backup manual criado' });

    return apiSuccess({ id, filename });
  }

  if (action === 'export') {
    const db = getDb();
    const tables = ['pelotoes', 'users', 'discentes', 'disciplinas', 'notas', 'autorizacoes_discente'];
    const data: Record<string, unknown[]> = {};

    for (const table of tables) {
      if (table === 'users') {
        data[table] = db.prepare(`SELECT id, login, nome, role, pelotao_id, discente_id, ativo, created_at FROM users`).all();
      } else {
        data[table] = db.prepare(`SELECT * FROM ${table}`).all();
      }
    }

    return apiSuccess(data);
  }

  if (action === 'restore' && backup_id) {
    const db = getDb();
    const backup = db.prepare('SELECT * FROM backups WHERE id = ?').get(backup_id) as { filename: string } | undefined;
    if (!backup) return apiError('Backup não encontrado', 404);

    const filepath = path.join(BACKUP_DIR, backup.filename);
    if (!fs.existsSync(filepath)) return apiError('Arquivo de backup não encontrado', 404);

    const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));

    const restoreBackup = db.prepare(`INSERT INTO backups (id, filename, created_by, tipo, descricao) VALUES (?, ?, ?, 'RESTAURACAO', ?)`);
    const preRestoreFilename = `pre_restore_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const preRestorePath = path.join(BACKUP_DIR, preRestoreFilename);
    const currentData: Record<string, unknown[]> = {};
    for (const table of ['pelotoes', 'users', 'discentes', 'disciplinas', 'notas', 'autorizacoes_discente']) {
      currentData[table] = db.prepare(`SELECT * FROM ${table}`).all();
    }
    fs.writeFileSync(preRestorePath, JSON.stringify(currentData, null, 2));

    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM notas').run();
      db.prepare('DELETE FROM autorizacoes_discente').run();
      db.prepare('DELETE FROM discentes').run();
      db.prepare('DELETE FROM disciplinas').run();
      db.prepare('DELETE FROM users WHERE role != ?').run('CONTROLADOR_GERAL');
      db.prepare('DELETE FROM pelotoes').run();

      for (const pelotao of data.pelotoes || []) {
        db.prepare('INSERT INTO pelotoes (id, numero, nome, controlador_id, ultima_atualizacao, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
          pelotao.id, pelotao.numero, pelotao.nome, pelotao.controlador_id, pelotao.ultima_atualizacao, pelotao.created_at
        );
      }
      for (const user of data.users || []) {
        if (user.role === 'CONTROLADOR_GERAL') continue;
        db.prepare('INSERT OR REPLACE INTO users (id, login, password_hash, nome, role, pelotao_id, discente_id, ativo, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
          user.id, user.login, user.password_hash, user.nome, user.role, user.pelotao_id, user.discente_id, user.ativo, user.created_at, user.updated_at
        );
      }
      for (const disc of data.disciplinas || []) {
        db.prepare('INSERT INTO disciplinas (id, nome, descricao, pontos_distribuidos, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(
          disc.id, disc.nome, disc.descricao, disc.pontos_distribuidos, disc.created_at, disc.updated_at
        );
      }
      for (const discente of data.discentes || []) {
        db.prepare('INSERT INTO discentes (id, nome, matricula, pelotao_id, data_ingresso, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
          discente.id, discente.nome, discente.matricula, discente.pelotao_id, discente.data_ingresso, discente.user_id, discente.created_at, discente.updated_at
        );
      }
      for (const nota of data.notas || []) {
        db.prepare('INSERT INTO notas (id, discente_id, disciplina_id, pontos_obtidos, lancado_por_id, tipo_lancamento, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
          nota.id, nota.discente_id, nota.disciplina_id, nota.pontos_obtidos, nota.lancado_por_id, nota.tipo_lancamento, nota.created_at, nota.updated_at
        );
      }
      for (const aut of data.autorizacoes_discente || []) {
        db.prepare('INSERT INTO autorizacoes_discente (id, pelotao_id, disciplina_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(
          aut.id, aut.pelotao_id, aut.disciplina_id, aut.status, aut.created_at, aut.updated_at
        );
      }
    });

    transaction();

    restoreBackup.run(uuidv4(), preRestoreFilename, auth.user.id, 'Backup automático antes da restauração');
    logAudit({ user: auth.user, acao: 'RESTAURACAO', valor_novo: backup.filename, motivo: 'Restauração de backup' });

    return apiSuccess({ success: true });
  }

  return apiError('Ação inválida');
}
