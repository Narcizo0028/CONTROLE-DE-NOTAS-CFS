import fs from 'fs';
import path from 'path';

const root = process.cwd();

const requiredDirs = ['app', 'components', 'lib', 'public'];
const requiredFiles = [
  'package.json',
  'render.yaml',
  'middleware.ts',
  'next.config.js',
  'lib/render-bootstrap.ts',
  'lib/db.ts',
  'app/layout.tsx',
  'public/images/escudo-efas.png',
];

const forbiddenRootFiles = [
  /^page \(\d+\)\.tsx$/,
  /^route \(\d+\)\.tsx$/,
  /^AppLayout\.tsx$/,
  /^auth\.ts$/,
  /^db\.ts$/,
  /^check-structure\.mjs$/,
];

let ok = true;

console.log('Verificando estrutura do repositório...\n');

for (const dir of requiredDirs) {
  const exists = fs.existsSync(path.join(root, dir));
  console.log(`${exists ? 'OK' : 'FALTA'}  pasta ${dir}/`);
  if (!exists) ok = false;
}

for (const file of requiredFiles) {
  const exists = fs.existsSync(path.join(root, file));
  console.log(`${exists ? 'OK' : 'FALTA'}  ${file}`);
  if (!exists) ok = false;
}

const rootFiles = fs.readdirSync(root);
const bad = rootFiles.filter((name) => forbiddenRootFiles.some((rx) => rx.test(name)));
if (bad.length > 0) {
  ok = false;
  console.log('\nERRO: arquivos soltos na raiz (estrutura errada no GitHub):');
  bad.slice(0, 15).forEach((f) => console.log(`  - ${f}`));
  if (bad.length > 15) console.log(`  ... e mais ${bad.length - 15}`);
}

console.log('');
if (ok) {
  console.log('Estrutura OK para deploy no Render.');
  process.exit(0);
}

console.log('CORRIJA o repositório GitHub antes do deploy.');
console.log('Use o ZIP CFS-2026-NOTAS-RENDER-v1.0.2.zip ou git push da pasta completa.');
process.exit(1);
