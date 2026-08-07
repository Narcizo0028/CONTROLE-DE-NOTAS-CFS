import type { Disciplina, LancamentoNota, CampoAvaliacao, SituacaoAptoInapto } from './types';

export function getCamposAvaliacao(disciplina: Disciplina): CampoAvaliacao[] {
  if (disciplina.tipo_avaliacao === 'APTO_INAPTO') {
    return [{ key: 'situacao', label: 'Situação', tipo: 'radio', opcoes: ['APTO', 'INAPTO'] }];
  }

  const campos: CampoAvaliacao[] = [];

  if (disciplina.qtd_trabalhos === 2) {
    if (disciplina.max_trabalho_1 > 0) {
      campos.push({ key: 'trabalho_1', label: 'Trabalho 1', tipo: 'number', max: disciplina.max_trabalho_1 });
    }
    if (disciplina.max_trabalho_2 > 0) {
      campos.push({ key: 'trabalho_2', label: 'Trabalho 2', tipo: 'number', max: disciplina.max_trabalho_2 });
    }
  } else if (disciplina.qtd_trabalhos >= 1 && disciplina.max_trabalho > 0) {
    campos.push({ key: 'trabalho', label: 'Trabalho', tipo: 'number', max: disciplina.max_trabalho });
  }

  if (disciplina.possui_avc && disciplina.max_avc > 0) {
    campos.push({ key: 'avc', label: 'AVC', tipo: 'number', max: disciplina.max_avc });
  }

  if (disciplina.possui_avf && disciplina.max_avf > 0) {
    campos.push({ key: 'avf', label: 'AVF', tipo: 'number', max: disciplina.max_avf });
  }

  return campos;
}

export function calcularNotaFinal(disciplina: Disciplina, valores: LancamentoNota): number | null {
  if (disciplina.tipo_avaliacao === 'APTO_INAPTO') return null;

  let total = 0;
  if (disciplina.qtd_trabalhos === 2) {
    total += valores.trabalho_1 ?? 0;
    total += valores.trabalho_2 ?? 0;
  } else {
    total += valores.trabalho ?? 0;
  }
  if (disciplina.possui_avc) total += valores.avc ?? 0;
  if (disciplina.possui_avf) total += valores.avf ?? 0;
  return total;
}

function isValorVazio(val: unknown): boolean {
  return val === undefined || val === null || val === '';
}

export function validarLancamento(
  disciplina: Disciplina,
  valores: LancamentoNota
): { valid: boolean; error?: string } {
  if (disciplina.tipo_avaliacao === 'APTO_INAPTO') {
    if (!valores.situacao || !['APTO', 'INAPTO'].includes(valores.situacao)) {
      return { valid: false, error: 'Selecione APTO ou INAPTO' };
    }
    return { valid: true };
  }

  for (const campo of getCamposAvaliacao(disciplina)) {
    const val = valores[campo.key];
    if (isValorVazio(val)) {
      return { valid: false, error: `${campo.label} é obrigatório` };
    }
    const num = Number(val);
    if (isNaN(num) || num < 0) {
      return { valid: false, error: `${campo.label} deve ser um valor válido` };
    }
    if (campo.max !== undefined && num > campo.max) {
      return { valid: false, error: `Valor superior ao permitido para esta avaliação. ${campo.label} máximo = ${campo.max}` };
    }
  }

  const notaFinal = calcularNotaFinal(disciplina, valores);
  if (notaFinal !== null && notaFinal > disciplina.pontos_distribuidos) {
    return { valid: false, error: `Nota final (${notaFinal}) excede o total da disciplina (${disciplina.pontos_distribuidos})` };
  }

  return { valid: true };
}

export function parseLancamentoFromImport(
  disciplina: Disciplina,
  data: Record<string, unknown>
): { valores: LancamentoNota; error?: string } {
  if (disciplina.tipo_avaliacao === 'APTO_INAPTO') {
    const sit = String(data.situacao || data.pontos_obtidos || data.nota || '').toUpperCase();
    if (sit === 'APTO' || sit === 'INAPTO') {
      return { valores: { situacao: sit as SituacaoAptoInapto } };
    }
    return { valores: {}, error: 'Situação deve ser APTO ou INAPTO' };
  }

  const valores: LancamentoNota = {};

  if (disciplina.qtd_trabalhos === 2) {
    valores.trabalho_1 = num(data.trabalho_1 ?? data['Trabalho 1']);
    valores.trabalho_2 = num(data.trabalho_2 ?? data['Trabalho 2']);
  } else {
    valores.trabalho = num(data.trabalho ?? data.Trabalho);
  }

  if (disciplina.possui_avc) valores.avc = num(data.avc ?? data.AVC);
  if (disciplina.possui_avf) valores.avf = num(data.avf ?? data.AVF);

  const validation = validarLancamento(disciplina, valores);
  if (!validation.valid) return { valores, error: validation.error };

  return { valores };
}

function num(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

export function formatNotaResumo(
  disciplina: Disciplina,
  nota: LancamentoNota & { nota_final?: number | null; situacao?: string | null }
): string {
  if (disciplina.tipo_avaliacao === 'APTO_INAPTO') return nota.situacao || '—';

  const parts: string[] = [];
  if (nota.trabalho != null) parts.push(`Trabalho: ${nota.trabalho}`);
  if (nota.trabalho_1 != null) parts.push(`Trabalho 1: ${nota.trabalho_1}`);
  if (nota.trabalho_2 != null) parts.push(`Trabalho 2: ${nota.trabalho_2}`);
  if (nota.avc != null) parts.push(`AVC: ${nota.avc}`);
  if (nota.avf != null) parts.push(`AVF: ${nota.avf}`);

  const final = nota.nota_final ?? calcularNotaFinal(disciplina, nota);
  return parts.length > 0 ? `${parts.join(' | ')} → ${final}` : '—';
}

export function prepararNotaParaSalvar(disciplina: Disciplina, valores: LancamentoNota) {
  const notaFinal = calcularNotaFinal(disciplina, valores);
  const pontosObtidos = disciplina.tipo_avaliacao === 'APTO_INAPTO' ? 0 : (notaFinal ?? 0);

  return {
    trabalho: valores.trabalho ?? null,
    trabalho_1: valores.trabalho_1 ?? null,
    trabalho_2: valores.trabalho_2 ?? null,
    avc: valores.avc ?? null,
    avf: valores.avf ?? null,
    situacao: valores.situacao ?? null,
    nota_final: notaFinal,
    pontos_obtidos: pontosObtidos,
  };
}
