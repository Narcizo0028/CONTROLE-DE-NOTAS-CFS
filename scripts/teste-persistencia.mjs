/**
 * Simula o disco persistente do Render: cria o banco, altera a senha do admin,
 * reinicia o bootstrap e verifica se a senha alterada sobreviveu.
 *
 * Uso: node --experimental-sqlite --import tsx scripts/teste-persistencia.mjs
 */
import bcrypt from 'bcryptjs';

process.env.RENDER = 'true';
process.env.NODE_ENV = 'production';
delete process.env.SEED_DEMO_DATA;

const { getDb, closeDb } = await import('../lib/db.ts');
const { ensureDemoAccess } = await import('../lib/ensure-demo.ts');

const NOVA_SENHA = 'senha-nova-do-comandante-2026';
let falhas = 0;

function checar(descricao, condicao) {
  console.log(`${condicao ? '[OK]   ' : '[FALHA]'} ${descricao}`);
  if (!condicao) falhas++;
}

console.log(`Banco de teste: ${process.env.DATABASE_DIR}\n`);

console.log('--- 1º boot: banco vazio ---');
getDb();
await ensureDemoAccess();
let db = getDb();
const total = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
checar(`contas criadas automaticamente (${total} usuários)`, total > 0);

const admin = db.prepare("SELECT id, password_hash FROM users WHERE login = 'admin.geral'").get();
checar('admin.geral existe', Boolean(admin));
checar('senha inicial admin123 funciona', await bcrypt.compare('admin123', admin.password_hash));

console.log('\n--- comandante altera a própria senha ---');
db.prepare('UPDATE users SET password_hash = ? WHERE login = ?')
  .run(await bcrypt.hash(NOVA_SENHA, 12), 'admin.geral');
closeDb();

console.log('\n--- 2º boot: banco já populado (reinício do serviço) ---');
getDb();
await ensureDemoAccess();
db = getDb();

const depois = db.prepare("SELECT password_hash FROM users WHERE login = 'admin.geral'").get();
checar('senha alterada sobreviveu ao reinício', await bcrypt.compare(NOVA_SENHA, depois.password_hash));
checar('senha demo NÃO foi restaurada', !(await bcrypt.compare('admin123', depois.password_hash)));

const totalDepois = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
checar(`nenhum usuário duplicado (${totalDepois})`, totalDepois === total);

closeDb();
console.log(falhas === 0 ? '\nPersistência OK.' : `\n${falhas} falha(s).`);
process.exit(falhas === 0 ? 0 : 1);
