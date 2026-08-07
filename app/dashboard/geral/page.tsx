'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import StatCard from '@/components/StatCard';
import {
  GraduationCap, Users, BookOpen, FileText, AlertTriangle, Trophy,
  RefreshCw, BarChart3, Shield, Database, ChevronRight,
} from 'lucide-react';
import { formatDateTime, formatPercent, formatMedia } from '@/lib/utils';

interface DashboardData {
  stats: {
    totalDiscentes: number;
    totalPelotoes: number;
    totalDisciplinas: number;
    totalNotas: number;
    lancamentosHoje: number;
  };
  pelotaoStatus: Array<{
    id: string; nome: string; numero: number;
    total_discentes: number; percentual_atualizacao: number;
    ultima_atualizacao: string | null;
  }>;
  divergencias: {
    pelotaoStats: Array<{ pelotao_nome: string; tem_divergencia: boolean; media_pontos: number }>;
    disciplinasFaltantes: Array<{ disciplina: string; pelotao_com: string; pelotao_sem: string }>;
  };
  rankingTop5: Array<{ posicao: number; nome: string; percentual: number; pelotao_nome: string }>;
}

const quickLinks = [
  { href: '/ranking', label: 'Ranking', icon: Trophy, primary: true },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { href: '/auditoria', label: 'Auditoria', icon: Shield },
  { href: '/backup', label: 'Backup', icon: Database },
];

function rankBadgeClass(posicao: number) {
  if (posicao === 1) return 'bg-pmmg-gold-400 text-pmmg-black ring-2 ring-pmmg-gold-300';
  if (posicao === 2) return 'bg-pmmg-gray-300 text-pmmg-black';
  if (posicao === 3) return 'bg-pmmg-khaki-400 text-pmmg-black';
  return 'bg-pmmg-khaki-100 text-pmmg-gray-700 border border-pmmg-khaki-300';
}

export default function DashboardGeralPage() {
  const [data, setData] = useState<DashboardData | null>(null);
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
      <AppLayout title="Painel Geral">
        <div className="flex flex-col items-center justify-center py-16 sm:py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pmmg-gold-400 mb-4" />
          <p className="text-sm text-pmmg-gray-600 uppercase tracking-wide">Carregando painel...</p>
        </div>
      </AppLayout>
    );
  }

  const alertas = [
    ...data.divergencias.pelotaoStats.filter((p) => p.tem_divergencia).map((p) => ({
      tipo: 'warning' as const,
      msg: `${p.pelotao_nome}: discentes com pontos distribuídos divergentes`,
    })),
    ...data.divergencias.disciplinasFaltantes.slice(0, 5).map((d) => ({
      tipo: 'info' as const,
      msg: `${d.disciplina}: lançada em ${d.pelotao_com}, ausente em ${d.pelotao_sem}`,
    })),
  ];

  const mediaAtualizacao = data.pelotaoStatus.length > 0
    ? data.pelotaoStatus.reduce((s, p) => s + p.percentual_atualizacao, 0) / data.pelotaoStatus.length
    : 0;

  return (
    <AppLayout title="Painel Geral">
      <div className="space-y-5 sm:space-y-6 lg:space-y-8 max-w-[1600px] mx-auto">
        {/* Hero / resumo executivo */}
        <div className="dashboard-hero">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-pmmg-gold-400 text-xs font-bold uppercase tracking-widest mb-1">
                CFS 2026 — PMMG/EFAS
              </p>
              <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wide">
                Visão Geral do Curso
              </h2>
              <p className="text-pmmg-gray-300 text-sm mt-2 max-w-xl">
                Acompanhe discentes, lançamentos de notas, ranking e alertas de divergência entre pelotões.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="rounded-lg bg-pmmg-black-light/80 border border-pmmg-gold-400/30 px-4 py-3 text-center sm:text-left">
                <p className="text-[10px] uppercase tracking-wider text-pmmg-gray-400">Média de atualização</p>
                <p className="text-2xl font-bold text-pmmg-gold-400">{formatPercent(mediaAtualizacao)}</p>
              </div>
              <button
                onClick={loadData}
                className="btn-primary whitespace-nowrap justify-center"
                disabled={loading}
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Atualizar
              </button>
            </div>
          </div>
        </div>

        {/* KPIs — mobile 2 cols, tablet 3, desktop 5 */}
        <section>
          <h3 className="dashboard-panel-title mb-3 px-1">Indicadores</h3>
          <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
            <StatCard title="Discentes" value={data.stats.totalDiscentes} icon={<GraduationCap size={22} />} color="blue" compact />
            <StatCard title="Pelotões" value={data.stats.totalPelotoes} icon={<Users size={22} />} color="green" compact />
            <StatCard title="Disciplinas" value={data.stats.totalDisciplinas} icon={<BookOpen size={22} />} color="purple" compact />
            <StatCard title="Notas Lançadas" value={data.stats.totalNotas} icon={<FileText size={22} />} color="yellow" compact />
            <StatCard
              title="Lançamentos Hoje"
              value={data.stats.lancamentosHoje}
              icon={<FileText size={22} />}
              color="red"
              compact
            />
          </div>
        </section>

        {/* Alertas */}
        {alertas.length > 0 && (
          <section className="dashboard-panel border-pmmg-gold-300">
            <div className="dashboard-panel-header bg-pmmg-gold-50">
              <h3 className="dashboard-panel-title text-pmmg-gold-800">
                <AlertTriangle size={18} className="text-pmmg-gold-600" />
                Alertas de Divergências
                <span className="ml-2 badge-yellow">{alertas.length}</span>
              </h3>
            </div>
            <div className="dashboard-panel-body">
              <ul className="space-y-2">
                {alertas.map((a, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-sm text-pmmg-gray-800 py-2 px-3 rounded-lg bg-pmmg-khaki-50 border border-pmmg-khaki-200"
                  >
                    <span className="text-pmmg-gold-600 shrink-0">•</span>
                    <span>{a.msg}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Conteúdo principal — empilha no mobile/tablet, lado a lado no desktop */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 sm:gap-6">
          {/* Atualização por pelotão */}
          <section className="dashboard-panel">
            <div className="dashboard-panel-header">
              <h3 className="dashboard-panel-title">
                <BarChart3 size={18} className="text-pmmg-gold-500" />
                Atualização por Pelotão
              </h3>
            </div>
            <div className="dashboard-panel-body space-y-4">
              {data.pelotaoStatus.map((p) => (
                <div key={p.id} className="space-y-2">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-pmmg-black truncate">{p.nome}</p>
                      <p className="text-xs text-pmmg-gray-500">
                        {p.total_discentes} discente(s)
                        {p.ultima_atualizacao && (
                          <span className="hidden md:inline"> · {formatDateTime(p.ultima_atualizacao)}</span>
                        )}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-pmmg-gold-700 shrink-0">
                      {formatPercent(p.percentual_atualizacao)}
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-pmmg-khaki-100 rounded-full overflow-hidden border border-pmmg-khaki-200">
                    <div
                      className="h-full bg-gradient-to-r from-pmmg-gold-500 to-pmmg-gold-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(p.percentual_atualizacao, 100)}%` }}
                    />
                  </div>
                  {p.ultima_atualizacao && (
                    <p className="text-[10px] text-pmmg-gray-400 md:hidden">
                      Última atualização: {formatDateTime(p.ultima_atualizacao)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Top 5 ranking */}
          <section className="dashboard-panel">
            <div className="dashboard-panel-header">
              <h3 className="dashboard-panel-title">
                <Trophy size={18} className="text-pmmg-gold-500" />
                Top 5 — Ranking Geral
              </h3>
              <Link href="/ranking" className="text-xs font-bold uppercase text-pmmg-gold-600 hover:text-pmmg-gold-500 flex items-center gap-1">
                Ver todos <ChevronRight size={14} />
              </Link>
            </div>
            <div className="dashboard-panel-body p-0 sm:p-0">
              <ul className="divide-y divide-pmmg-khaki-100">
                {data.rankingTop5.map((r) => (
                  <li
                    key={r.posicao}
                    className="flex items-center gap-3 sm:gap-4 px-4 py-3 sm:px-6 sm:py-4 hover:bg-pmmg-khaki-50/50 transition-colors"
                  >
                    <span
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${rankBadgeClass(r.posicao)}`}
                    >
                      {r.posicao}º
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-pmmg-black truncate">{r.nome}</p>
                      <p className="text-xs text-pmmg-gray-500 truncate">{r.pelotao_nome}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm sm:text-base font-bold text-pmmg-gold-700">
                        {formatMedia(r.percentual)}
                      </p>
                    </div>
                  </li>
                ))}
                {data.rankingTop5.length === 0 && (
                  <li className="px-6 py-8 text-center text-sm text-pmmg-gray-500">
                    Nenhum dado de ranking disponível.
                  </li>
                )}
              </ul>
            </div>
          </section>
        </div>

        {/* Acesso rápido — 2 cols mobile, 4 cols tablet+ */}
        <section>
          <h3 className="dashboard-panel-title mb-3 px-1">Acesso Rápido</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={link.primary ? 'quick-link-primary' : 'quick-link'}
                >
                  <Icon size={22} className={link.primary ? '' : 'text-pmmg-gold-600'} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
