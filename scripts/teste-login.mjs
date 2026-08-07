/**
 * Teste end-to-end de login e rotas protegidas.
 * Uso: node scripts/teste-login.mjs [baseUrl]
 */
const base = process.argv[2] ?? 'http://localhost:3000';

const contas = [
  { login: 'admin.geral', senha: 'admin123', perfil: 'Controlador Geral' },
  { login: 'ctrl.pelotao1', senha: 'pelotao1', perfil: 'Controlador Pelotão' },
  { login: 'disc.2026001', senha: 'discente123', perfil: 'Discente' },
  { login: '  ADMIN.GERAL ', senha: 'admin123', perfil: 'Login com espaços/maiúsculas' },
];

const rotasPorPerfil = {
  CONTROLADOR_GERAL: [
    '/api/auth/me', '/api/dashboard', '/api/pelotoes', '/api/disciplinas', '/api/discentes',
    '/api/notas', '/api/ranking', '/api/usuarios', '/api/auditoria',
    '/api/relatorios?tipo=todos_discentes', '/api/relatorios?tipo=divergencias',
    '/api/relatorios?tipo=atualizacao_pelotoes', '/api/relatorios?tipo=pontos_por_pelotao',
  ],
  'CONTROLADOR_PELOTÃO': [
    '/api/auth/me', '/api/dashboard', '/api/discentes', '/api/notas', '/api/ranking',
    '/api/autorizacoes', '/api/relatorios?tipo=pelotao_resumo',
  ],
  DISCENTE: ['/api/auth/me', '/api/dashboard', '/api/ranking'],
};

let falhas = 0;

async function testarConta({ login, senha, perfil }) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-proto': 'http' },
    body: JSON.stringify({ login, password: senha }),
  });

  const corpo = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.log(`[FALHA] ${perfil}: HTTP ${res.status} ${JSON.stringify(corpo)}`);
    falhas++;
    return;
  }

  const cookie = (res.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
  if (!cookie) {
    console.log(`[FALHA] ${perfil}: login OK mas nenhum cookie de sessão foi enviado`);
    falhas++;
    return;
  }

  const role = corpo.user?.role;
  console.log(`[OK]    ${perfil} → ${corpo.user?.nome} (${role})`);

  for (const rota of rotasPorPerfil[role] ?? ['/api/auth/me']) {
    const r = await fetch(`${base}${rota}`, { headers: { cookie, 'x-forwarded-proto': 'http' } });
    if (r.ok) {
      console.log(`        ${rota} → ${r.status}`);
    } else {
      console.log(`        [FALHA] ${rota} → ${r.status} ${(await r.text()).slice(0, 120)}`);
      falhas++;
    }
  }
}

async function testarSenhaErrada() {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ login: 'usuario.inexistente', password: 'x' }),
  });
  if (res.status === 401) {
    console.log('[OK]    Credencial inválida rejeitada com 401');
  } else {
    console.log(`[FALHA] Credencial inválida retornou ${res.status}`);
    falhas++;
  }
}

async function main() {
  console.log(`Testando ${base}\n`);
  const health = await fetch(`${base}/api/health`).then((r) => r.json());
  console.log(`Versão: ${health.version} | usuários: ${health.users} | banco: ${health.databaseDir}\n`);

  for (const conta of contas) await testarConta(conta);
  await testarSenhaErrada();

  console.log(falhas === 0 ? '\nTodos os testes passaram.' : `\n${falhas} falha(s).`);
  process.exit(falhas === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Erro no teste:', err);
  process.exit(1);
});
