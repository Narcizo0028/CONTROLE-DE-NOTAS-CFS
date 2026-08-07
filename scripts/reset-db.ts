import { resetDb, closeDb } from '../lib/db';

console.log('Resetando banco de dados...');
resetDb();
console.log('Banco resetado. Disciplinas oficiais CFS 2026 carregadas.');
console.log('Execute npm run db:seed para popular usuários e dados de teste.');
closeDb();
