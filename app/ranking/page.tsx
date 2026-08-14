'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import DataTable from '@/components/DataTable';
import { RefreshCw } from 'lucide-react';
import { formatMedia, censorName } from '@/lib/utils';
import { useAuth } from '@/components/AuthProvider';
import { exportTableToPDF } from '@/lib/pdf-export';

interface RankingEntry {
  posicao: number; discente_id: string; nome: string;
  pelotao_nome: string; pelotao_numero: number;
  pontos_distribuidos: number; pontos_obtidos: number; percentual: number;
}

export default function RankingPage() {
  const { user } = useAuth();
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [pelotoes, setPelotoes] = useState<Array<{ id: string; nome: string }>>([]);
  const [filtroPelotao, setFiltroPelotao] = useState('');
  const [selectedPelotoes, setSelectedPelotoes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRanking = async (pelotaoId?: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (pelotaoId) params.set('pelotao_id', pelotaoId);
    const res = await fetch(`/api/ranking?${params.toString()}`);
    if (res.ok) setRanking(await res.json());
    setLoading(false);
  };

  const loadSelectedRanking = async () => {
    if (selectedPelotoes.length < 2) return;
    setLoading(true);
    const res = await fetch(`/api/ranking?pelotao_ids=${selectedPelotoes.join(',')}`);
    if (res.ok) setRanking(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    fetch('/api/pelotoes').then((r) => r.json()).then(setPelotoes);
    loadRanking();
  }, [user]);

  const handleRefresh = async () => {
    await fetch('/api/ranking', { method: 'POST' });
    loadRanking(filtroPelotao || undefined);
  };

  const isCensored = user?.role === 'DISCENTE';

  const handleExportPDF = () => {
    exportTableToPDF(
      'Ranking CFS 2026',
      ['Pos.', 'Nome', 'Pelotão', 'Distribuídos', 'Obtidos', 'Média'],
      ranking.map((r) => [
        String(r.posicao),
        isCensored ? censorName(r.nome, r.discente_id === user?.discente_id) : r.nome,
        r.pelotao_nome,
        String(r.pontos_distribuidos),
        String(r.pontos_obtidos),
        formatMedia(r.percentual),
      ])
    );
  };

  return (
    <AppLayout title="Ranking">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-3 items-center">
            {user?.role !== 'DISCENTE' && (
              <>
                <select
                  className="input w-auto"
                  value={filtroPelotao}
                  onChange={(e) => { setFiltroPelotao(e.target.value); loadRanking(e.target.value || undefined); }}
                >
                  <option value="">Ranking Geral</option>
                  {pelotoes.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleRefresh} className="btn-secondary"><RefreshCw size={16} /> Atualizar Ranking</button>
            <button onClick={handleExportPDF} className="btn-secondary">Exportar PDF</button>
          </div>
        </div>

        {user?.role === 'CONTROLADOR_GERAL' && (
          <div className="card space-y-3">
            <h3 className="font-semibold">Ranking entre Pelotões</h3>
            <p className="text-sm text-gray-600">Selecione exatamente dois pelotões para gerar um ranking único entre os discentes selecionados.</p>
            <div className="flex flex-wrap gap-2">
              {pelotoes.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedPelotoes.includes(p.id)}
                    onChange={(e) => {
                      if (e.target.checked && selectedPelotoes.length === 2) return;
                      setSelectedPelotoes(
                        e.target.checked
                          ? [...selectedPelotoes, p.id]
                          : selectedPelotoes.filter((id) => id !== p.id)
                      );
                    }}
                  />
                  {p.nome}
                </label>
              ))}
            </div>
            <button onClick={loadSelectedRanking} className="btn-primary" disabled={selectedPelotoes.length !== 2}>
              Gerar Ranking dos Pelotões Selecionados
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
          </div>
        ) : (
          <DataTable
            data={ranking}
            searchKeys={['nome', 'pelotao_nome']}
            pageSize={20}
            columns={[
              { key: 'posicao', label: 'Pos.' },
              {
                key: 'nome', label: 'Nome',
                render: (r) => (
                  <span className={isCensored && r.discente_id !== user?.discente_id ? 'censored' : ''}>
                    {isCensored ? censorName(r.nome, r.discente_id === user?.discente_id) : r.nome}
                  </span>
                ),
              },
              { key: 'pelotao_nome', label: 'Pelotão' },
              { key: 'pontos_distribuidos', label: 'Distribuídos' },
              { key: 'pontos_obtidos', label: 'Obtidos' },
              { key: 'percentual', label: 'Média', render: (r) => <span className="font-semibold text-primary-600">{formatMedia(r.percentual)}</span> },
            ]}
          />
        )}
      </div>
    </AppLayout>
  );
}
