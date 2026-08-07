'use client';

import type { Disciplina, CampoAvaliacao, LancamentoNota } from '@/lib/types';
import { getCamposAvaliacao } from '@/lib/avaliacao';

interface NotaFormProps {
  disciplina: Disciplina | null;
  valores: LancamentoNota;
  onChange: (valores: LancamentoNota) => void;
  disabled?: boolean;
}

export default function NotaForm({ disciplina, valores, onChange, disabled }: NotaFormProps) {
  if (!disciplina) {
    return <p className="text-sm text-gray-500">Selecione uma disciplina</p>;
  }

  const campos = getCamposAvaliacao(disciplina);

  if (disciplina.tipo_avaliacao === 'APTO_INAPTO') {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">Situação</p>
        <div className="flex gap-6">
          {(['APTO', 'INAPTO'] as const).map((opt) => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="situacao"
                value={opt}
                checked={valores.situacao === opt}
                onChange={() => onChange({ situacao: opt })}
                disabled={disabled}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-sm font-medium">{opt}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {campos.map((campo) => (
        <div key={campo.key}>
          <label className="label">
            {campo.label}
            {campo.max !== undefined && <span className="text-gray-400 font-normal"> (máx: {campo.max})</span>}
          </label>
          <input
            type="number"
            step="0.1"
            min={0}
            max={campo.max}
            className="input"
            value={valores[campo.key] ?? ''}
            onChange={(e) => onChange({ ...valores, [campo.key]: e.target.value === '' ? undefined : Number(e.target.value) })}
            disabled={disabled}
          />
        </div>
      ))}
      <div className="sm:col-span-2 lg:col-span-3">
        <p className="text-xs text-gray-500">
          Total da disciplina: {disciplina.pontos_distribuidos} pontos
          {disciplina.carga_horaria > 0 && ` · Carga horária: ${disciplina.carga_horaria}h`}
        </p>
      </div>
    </div>
  );
}

export function NotaFormInline({
  disciplina,
  valores,
  onChange,
}: {
  disciplina: Disciplina;
  valores: LancamentoNota;
  onChange: (v: LancamentoNota) => void;
}) {
  if (disciplina.tipo_avaliacao === 'APTO_INAPTO') {
    return (
      <select
        className="input w-28"
        value={valores.situacao || ''}
        onChange={(e) => onChange({ situacao: e.target.value as 'APTO' | 'INAPTO' })}
      >
        <option value="">—</option>
        <option value="APTO">APTO</option>
        <option value="INAPTO">INAPTO</option>
      </select>
    );
  }

  const fields: { key: keyof LancamentoNota; label: string; max: number }[] = [];
  if (disciplina.qtd_trabalhos === 2) {
    if (disciplina.max_trabalho_1) fields.push({ key: 'trabalho_1', label: 'T1', max: disciplina.max_trabalho_1 });
    if (disciplina.max_trabalho_2) fields.push({ key: 'trabalho_2', label: 'T2', max: disciplina.max_trabalho_2 });
  } else if (disciplina.max_trabalho) {
    fields.push({ key: 'trabalho', label: 'T', max: disciplina.max_trabalho });
  }
  if (disciplina.possui_avc && disciplina.max_avc) fields.push({ key: 'avc', label: 'AVC', max: disciplina.max_avc });
  if (disciplina.possui_avf && disciplina.max_avf) fields.push({ key: 'avf', label: 'AVF', max: disciplina.max_avf });

  return (
    <div className="flex gap-1 flex-wrap">
      {fields.map((f) => (
        <input
          key={f.key}
          type="number"
          min={0}
          max={f.max}
          placeholder={f.label}
          title={`${f.label} (máx ${f.max})`}
          className="input w-16 text-xs px-1"
          value={valores[f.key] ?? ''}
          onChange={(e) => onChange({ ...valores, [f.key]: e.target.value === '' ? undefined : Number(e.target.value) })}
        />
      ))}
    </div>
  );
}
