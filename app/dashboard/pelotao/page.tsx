'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import StatCard from '@/components/StatCard';
import { GraduationCap, BookOpen, FileText, Settings, Trophy, RefreshCw } from 'lucide-react';
import { formatDateTime, formatPercent, formatMedia } from '@/lib/utils';

export default function DashboardPelotaoPage() {
  const [data, setData] = useState<{
    stats: { totalDiscentes: number; totalDisciplinas: number; totalNotas: number; notasPendentes: number; autorizacoesAtivas: number };
    pelotao: { nome: string; ultima_atualizacao: string | null };
    ranking: Array<{ posicao: number; nome: string; percentual: number }>;
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
      <AppLayout title="Painel do Pelotão">
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`Painel — ${data.pelotao?.nome || 'Pelotão'}`}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">
            Última atualização: {formatDateTime(data.pelotao?.ultima_atualizacao)}
          </p>
          <button onClick={loadData} className="btn-secondary">
            <RefreshCw size={16} /> Atualizar
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Discentes" value={data.stats.totalDiscentes} icon={<GraduationCap />} color="blue" />
          <StatCard title="Disciplinas" value={data.stats.totalDisciplinas} icon={<BookOpen />} color="purple" />
          <StatCard title="Notas Lançadas" value={data.stats.totalNotas} icon={<FileText />} color="green" />
          <StatCard title="Notas Pendentes" value={data.stats.notasPendentes} icon={<FileText />} color="yellow" />
          <StatCard title="Autorizações Ativas" value={data.stats.autorizacoesAtivas} icon={<Settings />} color="red" />
        </div>

        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Trophy size={18} className="text-yellow-500" /> Ranking do Pelotão
          </h3>
          <div className="space-y-2">
            {data.ranking.map((r) => (
              <div key={r.posicao} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold">
                  {r.posicao}º
                </span>
                <span className="flex-1 text-sm font-medium">{r.nome}</span>
                <span className="text-sm font-semibold text-primary-600">{formatMedia(r.percentual)}</span>
              </div>
            ))}
            {data.ranking.length === 0 && <p className="text-gray-500 text-sm">Nenhuma nota lançada ainda.</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href="/discentes" className="btn-primary text-center">Discentes</Link>
          <Link href="/notas" className="btn-secondary text-center">Lançar Notas</Link>
          <Link href="/importacao" className="btn-secondary text-center">Importar JSON</Link>
          <Link href="/autorizacoes" className="btn-secondary text-center">Autorizações</Link>
        </div>
      </div>
    </AppLayout>
  );
}
