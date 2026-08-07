import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { ensureDisciplinasOficiais } from './seed-disciplinas';

function isEphemeralServerlessHost() {
  return Boolean(process.env.VERCEL || process.env.NETLIFY || process.env.NETLIFY_DEV);
}

function isRenderHost() {
  return Boolean(
    process.env.RENDER
    || process.env.RENDER_SERVICE_NAME
    || process.env.RENDER_EXTERNAL_URL
  );
}

function isWritableDir(dir: string): boolean {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const probe = path.join(dir, `.write-test-${process.pid}`);
    fs.writeFileSync(probe, 'ok');
    fs.unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

let cachedDataDir: string | null = null;

/**
 * O disco persistente do Render só existe quando o serviço foi criado pelo
 * render.yaml. Em serviços criados manualmente /var/data não é gravável, então
 * cada candidato é testado antes de ser adotado.
 */
function resolveDataDir(): string {
  if (cachedDataDir) return cachedDataDir;

  const candidates: string[] = [];
  if (process.env.DATABASE_DIR) candidates.push(process.env.DATABASE_DIR);
  if (isRenderHost()) candidates.push('/var/data');
  if (isEphemeralServerlessHost()) candidates.push('/tmp/cfs2026-data');
  candidates.push(path.join(process.cwd(), 'data'));
  candidates.push(path.join(os.tmpdir(), 'cfs2026-data'));

  for (const dir of candidates) {
    if (isWritableDir(dir)) {
      if (dir !== candidates[0]) {
        console.warn(`[db] Diretório "${candidates[0]}" indisponível. Usando "${dir}".`);
      }
      cachedDataDir = dir;
      return dir;
    }
  }

  throw new Error(`[db] Nenhum diretório gravável encontrado: ${candidates.join(', ')}`);
}

export function isPersistentDataDir(): boolean {
  const dir = getDbPaths().dir;
  return dir === process.env.DATABASE_DIR || dir === '/var/data';
}

function getDbPaths() {
  if (process.env.DATABASE_PATH) {
    return {
      dir: path.dirname(process.env.DATABASE_PATH),
      file: process.env.DATABASE_PATH,
    };
  }

  const dir = resolveDataDir();
  return { dir, file: path.join(dir, 'cfs2026.db') };
}

export function getDataDir(): string {
  return getDbPaths().dir;
}

export type DbInstance = DatabaseSync & {
  transaction: (fn: () => void) => () => void;
};

let db: DbInstance | null = null;

function wrapDatabase(database: DatabaseSync): DbInstance {
  const wrapped = database as DbInstance;
  wrapped.transaction = (fn: () => void) => {
    return () => {
      database.exec('BEGIN');
      try {
        fn();
        database.exec('COMMIT');
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    };
  };
  return wrapped;
}

function columnExists(database: DatabaseSync, table: string, column: string): boolean {
  const cols = database.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return cols.some((c) => c.name === column);
}

function migrateSchema(database: DatabaseSync) {
  const disciplinaCols: [string, string][] = [
    ['carga_horaria', 'INTEGER NOT NULL DEFAULT 0'],
    ['tipo_avaliacao', "TEXT NOT NULL DEFAULT 'NUMERICA'"],
    ['possui_avc', 'INTEGER NOT NULL DEFAULT 0'],
    ['possui_avf', 'INTEGER NOT NULL DEFAULT 1'],
    ['qtd_trabalhos', 'INTEGER NOT NULL DEFAULT 1'],
    ['max_trabalho', 'REAL NOT NULL DEFAULT 3'],
    ['max_trabalho_1', 'REAL NOT NULL DEFAULT 0'],
    ['max_trabalho_2', 'REAL NOT NULL DEFAULT 0'],
    ['max_avc', 'REAL NOT NULL DEFAULT 0'],
    ['max_avf', 'REAL NOT NULL DEFAULT 7'],
    ['participa_ranking', 'INTEGER NOT NULL DEFAULT 1'],
    ['participa_media', 'INTEGER NOT NULL DEFAULT 1'],
    ['ordem', 'INTEGER NOT NULL DEFAULT 0'],
  ];

  for (const [col, def] of disciplinaCols) {
    if (!columnExists(database, 'disciplinas', col)) {
      database.exec(`ALTER TABLE disciplinas ADD COLUMN ${col} ${def}`);
    }
  }

  const notaCols: [string, string][] = [
    ['trabalho', 'REAL'],
    ['trabalho_1', 'REAL'],
    ['trabalho_2', 'REAL'],
    ['avc', 'REAL'],
    ['avf', 'REAL'],
    ['situacao', 'TEXT'],
    ['nota_final', 'REAL'],
  ];

  for (const [col, def] of notaCols) {
    if (!columnExists(database, 'notas', col)) {
      database.exec(`ALTER TABLE notas ADD COLUMN ${col} ${def}`);
    }
  }

  // Migrar pontos_obtidos legados para nota_final
  if (columnExists(database, 'notas', 'nota_final')) {
    database.exec(`
      UPDATE notas SET nota_final = pontos_obtidos, trabalho = pontos_obtidos
      WHERE nota_final IS NULL AND pontos_obtidos IS NOT NULL
    `);
  }
}

export function getDb(): DbInstance {
  if (!db) {
    const { dir, file } = getDbPaths();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const database = new DatabaseSync(file);
    database.exec('PRAGMA journal_mode = WAL');
    database.exec('PRAGMA foreign_keys = ON');
    database.exec('PRAGMA busy_timeout = 10000');
    db = wrapDatabase(database);
    initializeSchema(db);
    migrateSchema(db);
    ensureDisciplinasOficiais(db);
  }
  return db;
}

function initializeSchema(database: DbInstance) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS pelotoes (
      id TEXT PRIMARY KEY,
      numero INTEGER NOT NULL UNIQUE,
      nome TEXT NOT NULL,
      controlador_id TEXT,
      ultima_atualizacao TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      login TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      nome TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('CONTROLADOR_GERAL', 'CONTROLADOR_PELOTÃO', 'DISCENTE')),
      pelotao_id TEXT REFERENCES pelotoes(id),
      discente_id TEXT,
      ativo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS discentes (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      matricula TEXT NOT NULL UNIQUE,
      pelotao_id TEXT NOT NULL REFERENCES pelotoes(id),
      data_ingresso TEXT NOT NULL,
      user_id TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS disciplinas (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL UNIQUE,
      descricao TEXT,
      carga_horaria INTEGER NOT NULL DEFAULT 0,
      tipo_avaliacao TEXT NOT NULL DEFAULT 'NUMERICA' CHECK(tipo_avaliacao IN ('NUMERICA', 'APTO_INAPTO')),
      possui_avc INTEGER NOT NULL DEFAULT 0,
      possui_avf INTEGER NOT NULL DEFAULT 1,
      qtd_trabalhos INTEGER NOT NULL DEFAULT 1,
      max_trabalho REAL NOT NULL DEFAULT 3,
      max_trabalho_1 REAL NOT NULL DEFAULT 0,
      max_trabalho_2 REAL NOT NULL DEFAULT 0,
      max_avc REAL NOT NULL DEFAULT 0,
      max_avf REAL NOT NULL DEFAULT 7,
      pontos_distribuidos REAL NOT NULL DEFAULT 10,
      participa_ranking INTEGER NOT NULL DEFAULT 1,
      participa_media INTEGER NOT NULL DEFAULT 1,
      ordem INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notas (
      id TEXT PRIMARY KEY,
      discente_id TEXT NOT NULL REFERENCES discentes(id),
      disciplina_id TEXT NOT NULL REFERENCES disciplinas(id),
      trabalho REAL,
      trabalho_1 REAL,
      trabalho_2 REAL,
      avc REAL,
      avf REAL,
      situacao TEXT CHECK(situacao IN ('APTO', 'INAPTO')),
      nota_final REAL,
      pontos_obtidos REAL NOT NULL DEFAULT 0,
      lancado_por_id TEXT NOT NULL REFERENCES users(id),
      tipo_lancamento TEXT NOT NULL CHECK(tipo_lancamento IN ('CONTROLADOR_GERAL', 'CONTROLADOR_PELOTÃO', 'DISCENTE')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(discente_id, disciplina_id)
    );

    CREATE TABLE IF NOT EXISTS autorizacoes_discente (
      id TEXT PRIMARY KEY,
      pelotao_id TEXT NOT NULL REFERENCES pelotoes(id),
      disciplina_id TEXT NOT NULL REFERENCES disciplinas(id),
      status TEXT NOT NULL DEFAULT 'BLOQUEADA' CHECK(status IN ('ATIVA', 'BLOQUEADA')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(pelotao_id, disciplina_id)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_nome TEXT,
      user_role TEXT,
      pelotao_id TEXT,
      discente_id TEXT,
      disciplina_id TEXT,
      tipo_avaliacao TEXT,
      valor_anterior TEXT,
      valor_novo TEXT,
      acao TEXT NOT NULL,
      motivo TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS login_attempts (
      id TEXT PRIMARY KEY,
      login TEXT NOT NULL,
      ip_address TEXT,
      success INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS backups (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      created_by TEXT REFERENCES users(id),
      tipo TEXT NOT NULL CHECK(tipo IN ('MANUAL', 'AUTOMATICO', 'RESTAURACAO')),
      descricao TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_notas_discente ON notas(discente_id);
    CREATE INDEX IF NOT EXISTS idx_notas_disciplina ON notas(disciplina_id);
    CREATE INDEX IF NOT EXISTS idx_discentes_pelotao ON discentes(pelotao_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_disciplinas_ordem ON disciplinas(ordem);
  `);
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

export function resetDb() {
  closeDb();
  const { file } = getDbPaths();
  if (fs.existsSync(file)) fs.unlinkSync(file);
  if (fs.existsSync(`${file}-wal`)) fs.unlinkSync(`${file}-wal`);
  if (fs.existsSync(`${file}-shm`)) fs.unlinkSync(`${file}-shm`);
  getDb();
}

export function queryAll<T>(sql: string, ...params: SQLInputValue[]): T[] {
  return getDb().prepare(sql).all(...params) as unknown as T[];
}

export function queryGet<T>(sql: string, ...params: SQLInputValue[]): T | undefined {
  return getDb().prepare(sql).get(...params) as unknown as T | undefined;
}
