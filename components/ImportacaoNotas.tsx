'use client';

import { useEffect, useState } from 'react';
import { Upload, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from './AuthProvider';

interface PreviewItem {
  discente_matricula: string; discente_nome: string; disciplina_nome: string;
  resumo: string; acao: 'INCLUIR' | 'ATUALIZAR' | 'REJEITAR'; motivo?: string;
}

export default function ImportacaoNotas() {
  const { user } = useAuth();
  const [preview, setPreview] = useState<PreviewItem[]>([]);
  const [resumo, setResumo] = useState<{ incluir: number; atualizar: number; rejeitar: number } | null>(null);
  const [rawData, setRawData] = useState<unknown[]>([]);
  const [pelotoes, setPelotoes] = useState<Array<{ id: string; nome: string }>>([]);
  const [pelotaoId, setPelotaoId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'CONTROLADOR_GERAL') {
      fetch('/api/pelotoes').then(async (res) => { if (res.ok) setPelotoes(await res.json()); });
    }
  }, [user?.role]);

  const getPelotaoId = () => user?.pelotao_id || pelotaoId;

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(''); setPreview([]); setResumo(null); setSuccess('');
    const file = event.target.files?.[0];
    if (!file) return;
    const selectedPelotao = getPelotaoId();
    if (!selectedPelotao) { setError('Selecione o pelotão antes de importar.'); return; }

    try {
      const json = JSON.parse(await file.text());
      const items = Array.isArray(json) ? json : json.notas;
      if (!Array.isArray(items)) { setError('O JSON deve ser um array ou conter a chave "notas".'); return; }

      setRawData(items);
      setLoading(true);
      const response = await fetch('/api/importacao', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: items, pelotao_id: selectedPelotao }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error); return; }
      setPreview(data.preview); setResumo(data.resumo);
    } catch {
      setError('Erro ao ler o arquivo. Verifique se é um JSON válido.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    const selectedPelotao = getPelotaoId();
    if (!selectedPelotao || !confirm('Confirma a importação das notas?')) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      const response = await fetch('/api/importacao', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: rawData, confirm: true, pelotao_id: selectedPelotao }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error); return; }
      setSuccess(`Importação concluída: ${data.incluidos} incluídos, ${data.atualizados} atualizados, ${data.rejeitados} rejeitados.`);
      setPreview([]); setResumo(null);
    } finally {
      setLoading(false);
    }
  };

  return <div className="space-y-6">
    <div className="card">
      <h3 className="font-semibold mb-3">Importação de Notas (JSON)</h3>
      {user?.role === 'CONTROLADOR_GERAL' && <div className="max-w-md mb-4"><label className="label">Pelotão</label><select className="input" value={pelotaoId} onChange={(e) => setPelotaoId(e.target.value)}><option value="">Selecione...</option>{pelotoes.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>}
      <p className="text-sm text-gray-500 mb-4">Envie um JSON com <code className="bg-gray-100 px-1 rounded">matricula</code>, <code className="bg-gray-100 px-1 rounded">disciplina</code> e os campos da nota.</p>
      <label className="btn-primary cursor-pointer inline-flex"><Upload size={16} /> Selecionar arquivo<input type="file" accept=".json" onChange={handleFile} className="hidden" /></label>
    </div>
    {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
    {success && <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm">{success}</div>}
    {resumo && <div className="card"><h3 className="font-semibold mb-3">Prévia da importação</h3><div className="flex gap-4 mb-4 text-sm"><span className="badge-green">{resumo.incluir} a incluir</span><span className="badge-yellow">{resumo.atualizar} a atualizar</span><span className="badge-red">{resumo.rejeitar} a rejeitar</span></div><div className="table-container max-h-96 overflow-y-auto"><table className="data-table"><thead><tr><th>Matrícula</th><th>Discente</th><th>Disciplina</th><th>Resultado</th><th>Ação</th><th>Motivo</th></tr></thead><tbody>{preview.map((p, i) => <tr key={i}><td>{p.discente_matricula}</td><td>{p.discente_nome}</td><td>{p.disciplina_nome}</td><td>{p.resumo}</td><td>{p.acao === 'INCLUIR' ? <span className="badge-green"><CheckCircle size={12} /> Incluir</span> : p.acao === 'ATUALIZAR' ? <span className="badge-yellow"><AlertTriangle size={12} /> Atualizar</span> : <span className="badge-red"><XCircle size={12} /> Rejeitar</span>}</td><td>{p.motivo || '—'}</td></tr>)}</tbody></table></div>{(resumo.incluir > 0 || resumo.atualizar > 0) && <button onClick={handleConfirm} disabled={loading} className="btn-primary mt-4">{loading ? 'Importando...' : 'Confirmar importação'}</button>}</div>}
  </div>;
}
