/**
 * Testes rápidos de login e APIs em produção local.
 */
const BASE = process.env.TEST_BASE || 'http://localhost:3000';

async function login(loginName, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: loginName, password }),
  });
  const data = await res.json();
  const cookie = res.headers.get('set-cookie') || '';
  return { ok: res.ok, status: res.status, data, cookie };
}

async function get(path, cookie) {
  const res = await fetch(`${BASE}${path}`, {
    headers: cookie ? { Cookie: cookie.split(';')[0] } : {},
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function main() {
  console.log('Health...');
  const health = await get('/api/health');
  console.log(health.ok ? 'OK health' : 'FAIL health', health.status);

  const users = [
    ['admin.geral', 'admin123', 'CONTROLADOR_GERAL'],
    ['ctrl.pelotao1', 'pelotao1', 'CONTROLADOR_PELOTÃO'],
    ['disc.2026001', 'discente123', 'DISCENTE'],
  ];

  for (const [loginName, password, role] of users) {
    const result = await login(loginName, password);
    const label = `${loginName} (${role})`;
    if (!result.ok) {
      console.error('FAIL login', label, result.status, result.data.error);
      process.exitCode = 1;
      continue;
    }
    if (!result.cookie.includes('cfs_session')) {
      console.error('FAIL cookie', label, 'sem cfs_session');
      process.exitCode = 1;
      continue;
    }
    console.log('OK login', label);

    const cookie = result.cookie;
    const dash = await get('/api/dashboard', cookie);
    console.log(dash.ok ? '  OK dashboard' : '  FAIL dashboard', dash.status);

    const ranking = await get('/api/ranking', cookie);
    console.log(ranking.ok ? `  OK ranking (${Array.isArray(ranking.data) ? ranking.data.length : 0})` : '  FAIL ranking', ranking.status);

    const notas = await get('/api/notas', cookie);
    console.log(notas.ok ? `  OK notas (${Array.isArray(notas.data) ? notas.data.length : 0})` : '  FAIL notas', notas.status);

    if (role === 'CONTROLADOR_PELOTÃO') {
      const aut = await get('/api/autorizacoes', cookie);
      console.log(aut.ok ? '  OK autorizacoes' : '  FAIL autorizacoes', aut.status);
    }

    if (role === 'CONTROLADOR_GERAL') {
      const rel = await get('/api/relatorios?tipo=atualizacao_pelotoes', cookie);
      console.log(rel.ok ? '  OK relatorios' : '  FAIL relatorios', rel.status);
      const aud = await get('/api/auditoria', cookie);
      console.log(aud.ok ? '  OK auditoria' : '  FAIL auditoria', aud.status);
    }
  }

  console.log('Concluído.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
