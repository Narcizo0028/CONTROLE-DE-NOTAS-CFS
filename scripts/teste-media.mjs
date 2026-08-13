/**
 * Testes do cálculo e formatação da MÉDIA.
 * Uso: node scripts/teste-media.mjs
 */

function converterNumero(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
  return (
    Number(
      String(valor ?? 0)
        .replace(/\./g, '')
        .replace(',', '.')
    ) || 0
  );
}

function calcMediaRaw(pontosObtidos, pontosDistribuidos) {
  const obtidos = converterNumero(pontosObtidos);
  const distribuidos = converterNumero(pontosDistribuidos);
  if (distribuidos <= 0) return 0;
  const mediaCalculada = (obtidos / distribuidos) * 10;
  return Number.isFinite(mediaCalculada) ? mediaCalculada : 0;
}

function truncarMedia(valor) {
  if (!Number.isFinite(valor)) return 0;
  return Math.floor(valor * 100) / 100;
}

function calcMedia(pontosObtidos, pontosDistribuidos) {
  return truncarMedia(calcMediaRaw(pontosObtidos, pontosDistribuidos));
}

function formatarMedia(media) {
  return truncarMedia(media).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const casos = [
  { obtidos: 64.8, distribuidos: 65, esperado: 9.96, formatado: '9,96', desc: 'exemplo oficial' },
  { obtidos: '64,80', distribuidos: '65,00', esperado: 9.96, formatado: '9,96', desc: 'texto com vírgula' },
  { obtidos: 65, distribuidos: 65, esperado: 10, formatado: '10,00', desc: 'aproveitamento total' },
  { obtidos: 0, distribuidos: 65, esperado: 0, formatado: '0,00', desc: 'zero obtidos' },
  { obtidos: 10, distribuidos: 0, esperado: 0, formatado: '0,00', desc: 'distribuídos zero' },
  { obtidos: 33.333, distribuidos: 100, esperado: 3.33, formatado: '3,33', desc: 'truncamento (não 3,34)' },
  { obtidos: 9.999, distribuidos: 10, esperado: 9.99, formatado: '9,99', desc: 'truncamento próximo de 10' },
  { obtidos: '1.234,56', distribuidos: '1.300,00', esperado: 9.49, formatado: '9,49', desc: 'milhar com ponto' },
];

let falhas = 0;

console.log('=== Testes de calcularMedia ===\n');

for (const c of casos) {
  const media = calcMedia(c.obtidos, c.distribuidos);
  const texto = formatarMedia(media);
  const okCalc = media === c.esperado;
  const okFmt = texto === c.formatado;
  const okMax = media <= 10;
  const okFinite = Number.isFinite(media);

  if (!okCalc || !okFmt || !okMax || !okFinite) {
    falhas++;
    console.log(`[FALHA] ${c.desc}`);
    console.log(`  obtidos=${c.obtidos} distribuidos=${c.distribuidos}`);
    console.log(`  esperado=${c.esperado} obtido=${media}`);
    console.log(`  formatado esperado=${c.formatado} obtido=${texto}`);
  } else {
    console.log(`[OK]    ${c.desc} → ${texto}`);
  }
}

console.log('\n=== Ordenação do ranking (valor numérico, não texto) ===\n');

const alunos = [
  { nome: 'A', raw: calcMediaRaw(649.69, 650) },
  { nome: 'B', raw: calcMediaRaw(649.61, 650) },
];

alunos.sort((a, b) => b.raw - a.raw);
const ordemOk = alunos[0].nome === 'A' && alunos[1].nome === 'B';
console.log(ordemOk
  ? `[OK]    A (${alunos[0].raw.toFixed(4)}) antes de B (${alunos[1].raw.toFixed(4)}) — ambos exibem ${formatarMedia(truncarMedia(alunos[0].raw))}`
  : '[FALHA] ordenação incorreta');
if (!ordemOk) falhas++;

console.log(falhas === 0 ? '\nTodos os testes passaram.' : `\n${falhas} falha(s).`);
process.exit(falhas === 0 ? 0 : 1);
