'use client';

import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Upload, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface PreviewItem {
  discente_matricula: string; discente_nome: string; disciplina_nome: string;
  resumo: string; acao: 'INCLUIR' | 'ATUALIZAR' | 'REJEITAR'; motivo?: string;
}

export default function ImportacaoPage() {
  const [preview, setPreview] = useState<PreviewItem[]>([]);
  const [resumo, setResumo] = useState<{ incluir: number; atualizar: number; rejeitar: number } | null>(null);
  const [rawData, setRawData] = useState<unknown[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(''); setPreview([]); setResumo(null); setSuccess('');
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      let items: unknown[];
      if (Array.isArray(json)) {
        items = json;
      } else if (json.notas && Array.isArray(json.notas)) {
        items = json.notas;
      } else {
        setError('Formato inválido. O JSON deve ser um array ou conter a chave "notas".');
        return;
      }

      for (const item of items) {
        const i = item as Record<string, unknown>;
        if (!i.matricula && !i.discente_matricula) {
          setError('Cada item deve conter "matricula" (ou "discente_matricula") e "disciplina".');
          return;
        }
        if (!i.disciplina && !i.disciplina_nome) {
          setError('Cada item deve conter "disciplina" (ou "disciplina_nome").');
          return;
        }
        if (i.pontos_obtidos === undefined) {
          setError('Cada item deve conter "pontos_obtidos".');
          return;
        }
      }

      const normalized = items.map((item) => {
        const i = item as Record<string, unknown>;
        return {
          matricula: i.matricula || i.discente_matricula,
          disciplina: i.disciplina || i.disciplina_nome,
          pontos_obtidos: i.pontos_obtidos,
        };
      });

      setRawData(normalized);
      setLoading(true);

      const res = await fetch('/api/importacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: normalized }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }

      setPreview(data.preview);
      setResumo(data.resumo);
      setLoading(false);
    } catch {
      setError('Erro ao ler o arquivo. Verifique se é um JSON válido.');
    }
  };

  const handleConfirm = async () => {
    if (!confirm('Confirma a importação dos dados? Esta ação não pode ser desfeita automaticamente.')) return;
    setLoading(true); setError(''); setSuccess('');

    const res = await fetch('/api/importacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rawData, confirm: true }),
    });

    const data = await res.json();
    if (!res.ok) { setError(data.error); setLoading(false); return; }

    setSuccess(`Importação concluída: ${data.incluidos} incluídos, ${data.atualizados} atualizados, ${data.rejeitados} rejeitados.`);
    setPreview([]);
    setResumo(null);
    setLoading(false);
  };

  const acaoBadge = (acao: string) => {
    if (acao === 'INCLUIR') return <span className="badge-green flex items-center gap-1"><CheckCircle size={12} /> Incluir</span>;
    if (acao === 'ATUALIZAR') return <span className="badge-yellow flex items-center gap-1"><AlertTriangle size={12} /> Atualizar</span>;
    return <span className="badge-red flex items-center gap-1"><XCircle size={12} /> Rejeitar</span>;
  };

  return (
    <AppLayout title="Importação de Notas (JSON)">
      <div className="space-y-6">
        <div className="card">
          <h3 className="font-semibold mb-3">Enviar Arquivo JSON</h3>
          <p className="text-sm text-gray-500 mb-4">
            Formato esperado: array com <code className="bg-gray-100 px-1 rounded">matricula</code>, <code className="bg-gray-100 px-1 rounded">disciplina</code> e campos conforme o tipo (Trabalho, AVC, AVF, situacao APTO/INAPTO).
          </p>
          <label className="btn-primary cursor-pointer inline-flex">
            <Upload size={16} /> Selecionar Arquivo
            <input type="file" accept=".json" onChange={handleFile} className="hidden" />
          </label>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs font-mono">
            {`[\n  { "matricula": "2026001", "disciplina": "Português", "pontos_obtidos": 35 },\n  { "matricula": "2026002", "disciplina": "Português", "pontos_obtidos": 38 }\n]`}
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
        {success && <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm">{success}</div>}

        {resumo && (
          <div className="card">
            <h3 className="font-semibold mb-3">Prévia da Importação</h3>
            <div className="flex gap-4 mb-4 text-sm">
              <span className="badge-green">{resumo.incluir} a incluir</span>
              <span className="badge-yellow">{resumo.atualizar} a atualizar</span>
              <span className="badge-red">{resumo.rejeitar} a rejeitar</span>
            </div>

            <div className="table-container max-h-96 overflow-y-auto">
              <table className="data-table">
                <thead>
                  <tr><th>Matrícula</th><th>Discente</th><th>Disciplina</th><th>Resultado</th><th>Ação</th><th>Motivo</th></tr>
                </thead>
                <tbody>
                  {preview.map((p, i) => (
                    <tr key={i} className={p.acao === 'REJEITAR' ? 'bg-red-50' : p.acao === 'ATUALIZAR' ? 'bg-yellow-50' : ''}>
                      <td>{p.discente_matricula}</td>
                      <td>{p.discente_nome}</td>
                      <td>{p.disciplina_nome}</td>
                      <td className="text-xs">{p.resumo}</td>
                      <td>{acaoBadge(p.acao)}</td>
                      <td className="text-xs">{p.motivo || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(resumo.incluir > 0 || resumo.atualizar > 0) && (
              <button onClick={handleConfirm} disabled={loading} className="btn-primary mt-4">
                {loading ? 'Importando...' : 'Confirmar Importação'}
              </button>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
