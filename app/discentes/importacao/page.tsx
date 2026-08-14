'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { Upload, CheckCircle, XCircle, AlertTriangle, ArrowLeft } from 'lucide-react';

interface PreviewItem {
  matricula: string;
  nome: string;
  posto_graduacao: string;
  pelotao_nome: string;
  acao: 'INCLUIR' | 'ATUALIZAR' | 'REJEITAR';
  motivo?: string;
}

export default function ImportacaoDiscentesPage() {
  const [preview, setPreview] = useState<PreviewItem[]>([]);
  const [resumo, setResumo] = useState<{ incluir: number; atualizar: number; rejeitar: number } | null>(null);
  const [rawData, setRawData] = useState<unknown>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [pelotoes, setPelotoes] = useState<Array<{ id: string; nome: string }>>([]);
  const [pelotaoId, setPelotaoId] = useState('');

  useEffect(() => {
    fetch('/api/pelotoes').then(async (res) => {
      if (res.ok) setPelotoes(await res.json());
    });
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setPreview([]);
    setResumo(null);
    setSuccess('');

    const file = e.target.files?.[0];
    if (!file) return;
    if (!pelotaoId) {
      setError('Selecione o pelotão antes de enviar o arquivo.');
      e.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      setRawData(json);
      setLoading(true);

      const res = await fetch('/api/discentes/importacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: json, pelotao_id: pelotaoId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setLoading(false);
        return;
      }

      setPreview(data.preview);
      setResumo(data.resumo);
      setLoading(false);
    } catch {
      setError('Erro ao ler o arquivo. Verifique se é um JSON válido.');
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!confirm('Confirma a importação dos discentes? Matrículas existentes serão atualizadas.')) return;

    setLoading(true);
    setError('');
    setSuccess('');

    const res = await fetch('/api/discentes/importacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rawData, confirm: true, pelotao_id: pelotaoId }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      setLoading(false);
      return;
    }

    setSuccess(`Importação concluída: ${data.incluidos} incluídos, ${data.atualizados} atualizados, ${data.rejeitados} rejeitados.`);
    setPreview([]);
    setResumo(null);
    setRawData(null);
    setLoading(false);
  };

  const acaoBadge = (acao: string) => {
    if (acao === 'INCLUIR') return <span className="badge-green flex items-center gap-1"><CheckCircle size={12} /> Incluir</span>;
    if (acao === 'ATUALIZAR') return <span className="badge-yellow flex items-center gap-1"><AlertTriangle size={12} /> Atualizar</span>;
    return <span className="badge-red flex items-center gap-1"><XCircle size={12} /> Rejeitar</span>;
  };

  return (
    <AppLayout title="Importar Discentes (JSON)">
      <div className="space-y-6">
        <Link href="/discentes" className="inline-flex items-center gap-2 text-sm text-pmmg-gold-600 hover:text-pmmg-gold-700 font-semibold">
          <ArrowLeft size={16} /> Voltar para Discentes
        </Link>

        <div className="card">
          <h3 className="font-semibold mb-3">Enviar Arquivo JSON</h3>
          <p className="text-sm text-gray-500 mb-4">
            Selecione o pelotão e importe discentes em lote. Campos obrigatórios:{' '}
            <code className="bg-gray-100 px-1 rounded">nome</code>,{' '}
            <code className="bg-gray-100 px-1 rounded">matricula</code>,{' '}
            <code className="bg-gray-100 px-1 rounded">posto_graduacao</code> e{' '}
            <code className="bg-gray-100 px-1 rounded">senha</code>. O login é criado automaticamente com a matrícula.
          </p>

          <div className="max-w-md mb-4">
            <label className="label">Pelotão para importação</label>
            <select className="input" value={pelotaoId} onChange={(e) => setPelotaoId(e.target.value)}>
              <option value="">Selecione...</option>
              {pelotoes.map((pelotao) => <option key={pelotao.id} value={pelotao.id}>{pelotao.nome}</option>)}
            </select>
          </div>

          <a href="/modelo-importacao-discentes.json" download className="inline-flex text-sm font-semibold text-pmmg-gold-600 hover:text-pmmg-gold-700 mb-4">
            Baixar modelo JSON para preenchimento
          </a>

          <label className="btn-primary cursor-pointer inline-flex">
            <Upload size={16} /> Selecionar Arquivo
            <input type="file" accept=".json" onChange={handleFile} className="hidden" />
          </label>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs font-mono whitespace-pre-wrap">
{`{
  "discentes": [
    {
      "nome": "AMANDA JULIA ALVES VIEIRA",
      "matricula": "1828532",
      "posto_graduacao": "AL SGT PM",
      "senha": "SenhaSegura123"
    }
  ]
}`}
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
        {success && <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm">{success}</div>}

        {loading && !preview.length && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pmmg-gold-400" />
          </div>
        )}

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
                  <tr>
                    <th>Matrícula</th>
                    <th>Nome</th>
                    <th>Posto/Graduação</th>
                    <th>Pelotão</th>
                    <th>Ação</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((p, i) => (
                    <tr
                      key={i}
                      className={
                        p.acao === 'REJEITAR' ? 'bg-red-50' : p.acao === 'ATUALIZAR' ? 'bg-yellow-50' : ''
                      }
                    >
                      <td>{p.matricula}</td>
                      <td>{p.nome}</td>
                      <td>{p.posto_graduacao}</td>
                      <td>{p.pelotao_nome}</td>
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
