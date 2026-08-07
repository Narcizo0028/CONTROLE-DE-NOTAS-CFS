'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import StatCard from '@/components/StatCard';
import { Trophy, RefreshCw } from 'lucide-react';
import { formatMedia, censorName, calcMedia } from '@/lib/utils';
import { useAuth } from '@/components/AuthProvider';

export default function DashboardDiscentePage() {
  const { user } = useAuth();
  const [data, setData] = useState<{
    discente: { nome: string; pelotao_nome: string; pelotao_numero: number };
    rankingGeral: { posicao: number; percentual: number; pontos_distribuidos: number; pontos_obtidos: number } | null;
    rankingPelotao: { posicao: number; percentual: number } | null;
    notas: Array<{ disciplina_nome: string; pontos_obtidos: number; pontos_distribuidos: number }>;
    autorizacoes: Array<{ disciplina_nome: string; status: string }>;
    rankingCensurado: Array<{ posicao: number; nome: string; percentual: number; discente_id: string }>;
    rankingPelotaoCensurado: Array<{ posicao: number; nome: string; percentual: number; discente_id: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const res = await fetch('/api/dashboard');
    if (res.ok) setData(await res.json());
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  if (loading || !data) {
    return (
      <AppLayout title="Meu Painel">
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Meu Painel">
      <div className="space-y-6">
        <div className="flex justify-end">
          <button onClick={loadData} className="btn-secondary">
            <RefreshCw size={16} /> Atualizar
          </button>
        </div>

        <div className="card bg-primary-50 border-primary-200">
          <h2 className="text-xl font-bold text-primary-800">{data.discente.nome}</h2>
          <p className="text-primary-600">{data.discente.pelotao_nome}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Colocação Geral"
            value={data.rankingGeral ? `${data.rankingGeral.posicao}º` : '—'}
            color="blue"
          />
          <StatCard
            title="Colocação no Pelotão"
            value={data.rankingPelotao ? `${data.rankingPelotao.posicao}º` : '—'}
            color="green"
          />
          <StatCard
            title="Média Geral"
            value={data.rankingGeral ? formatMedia(data.rankingGeral.percentual) : '—'}
            color="purple"
          />
          <StatCard
            title="Pontos"
            value={data.rankingGeral ? `${data.rankingGeral.pontos_obtidos}/${data.rankingGeral.pontos_distribuidos}` : '—'}
            color="yellow"
          />
        </div>

        <div className="card">
          <h3 className="font-semibold mb-4">Minhas Notas</h3>
          {data.notas.length === 0 ? (
            <p className="text-gray-500 text-sm">Nenhuma nota lançada ainda.</p>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Disciplina</th><th>Obtidos</th><th>Distribuídos</th><th>Média</th></tr></thead>
                <tbody>
                  {data.notas.map((n, i) => (
                    <tr key={i}>
                      <td>{n.disciplina_nome}</td>
                      <td>{n.pontos_obtidos}</td>
                      <td>{n.pontos_distribuidos}</td>
                      <td>{formatMedia(calcMedia(n.pontos_obtidos, n.pontos_distribuidos))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {data.autorizacoes.length > 0 && (
          <div className="card border-green-200 bg-green-50">
            <h3 className="font-semibold text-green-800 mb-2">Disciplinas Autorizadas para Lançamento</h3>
            <p className="text-sm text-green-700">
              {data.autorizacoes.map((a) => a.disciplina_nome).join(', ')}
            </p>
            <a href="/minhas-notas" className="btn-success mt-3 inline-block text-sm">Lançar Notas</a>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Trophy size={18} className="text-yellow-500" /> Ranking Geral (Censurado)
            </h3>
            <div className="space-y-2">
              {data.rankingCensurado.map((r) => (
                <div key={r.posicao} className="flex items-center gap-3 py-1.5">
                  <span className="w-7 text-sm font-bold text-gray-500">{r.posicao}º</span>
                  <span className={`flex-1 text-sm ${r.discente_id === user?.discente_id ? 'font-bold' : 'censored'}`}>
                    {censorName(r.nome, r.discente_id === user?.discente_id)}
                  </span>
                  <span className="text-sm text-primary-600">{formatMedia(r.percentual)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Trophy size={18} className="text-yellow-500" /> Ranking do Pelotão (Censurado)
            </h3>
            <div className="space-y-2">
              {data.rankingPelotaoCensurado.map((r) => (
                <div key={r.posicao} className="flex items-center gap-3 py-1.5">
                  <span className="w-7 text-sm font-bold text-gray-500">{r.posicao}º</span>
                  <span className={`flex-1 text-sm ${r.discente_id === user?.discente_id ? 'font-bold' : 'censored'}`}>
                    {censorName(r.nome, r.discente_id === user?.discente_id)}
                  </span>
                  <span className="text-sm text-primary-600">{formatMedia(r.percentual)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
