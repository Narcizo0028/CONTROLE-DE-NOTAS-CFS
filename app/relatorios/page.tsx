'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import DataTable from '@/components/DataTable';
import { useAuth } from '@/components/AuthProvider';
import { formatDateTime, formatPercent, formatMedia, getTipoLancamentoLabel } from '@/lib/utils';
import { exportTableToPDF } from '@/lib/pdf-export';

const reportTypes = [
  { value: 'pelotao_resumo', label: 'Resumo do Pelotão', roles: ['CONTROLADOR_GERAL', 'CONTROLADOR_PELOTÃO'] },
  { value: 'notas_por_pelotao', label: 'Notas por Pelotão', roles: ['CONTROLADOR_GERAL', 'CONTROLADOR_PELOTÃO'] },
  { value: 'notas_por_disciplina', label: 'Notas por Disciplina', roles: ['CONTROLADOR_GERAL'] },
  { value: 'notas_lancadas', label: 'Notas Lançadas', roles: ['CONTROLADOR_GERAL', 'CONTROLADOR_PELOTÃO'] },
  { value: 'todos_discentes', label: 'Todos os Discentes', roles: ['CONTROLADOR_GERAL'] },
  { value: 'divergencias', label: 'Divergências', roles: ['CONTROLADOR_GERAL'] },
  { value: 'atualizacao_pelotoes', label: 'Atualização dos Pelotões', roles: ['CONTROLADOR_GERAL'] },
  { value: 'auditoria_notas', label: 'Histórico de Notas', roles: ['CONTROLADOR_GERAL', 'CONTROLADOR_PELOTÃO'] },
];

export default function RelatoriosPage() {
  const { user } = useAuth();
  const [tipo, setTipo] = useState('pelotao_resumo');
  const [data, setData] = useState<unknown>(null);
  const [pelotoes, setPelotoes] = useState<Array<{ id: string; nome: string }>>([]);
  const [disciplinas, setDisciplinas] = useState<Array<{ id: string; nome: string }>>([]);
  const [filtroPelotao, setFiltroPelotao] = useState('');
  const [filtroDisciplina, setFiltroDisciplina] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/pelotoes').then((r) => r.json()).then(setPelotoes);
    fetch('/api/disciplinas').then((r) => r.json()).then(setDisciplinas);
  }, []);

  const gerar = async () => {
    setLoading(true);
    let url = `/api/relatorios?tipo=${tipo}`;
    if (filtroPelotao) url += `&pelotao_id=${filtroPelotao}`;
    if (filtroDisciplina) url += `&disciplina_id=${filtroDisciplina}`;
    const res = await fetch(url);
    if (res.ok) setData(await res.json());
    setLoading(false);
  };

  const availableTypes = reportTypes.filter((r) => r.roles.includes(user?.role || ''));

  const renderData = () => {
    if (!data) return null;

    if (tipo === 'notas_lancadas' && Array.isArray(data)) {
      const notas = data as Array<Record<string, unknown>>;
      return (
        <DataTable
          data={notas}
          searchKeys={['discente_nome', 'disciplina_nome', 'pelotao_nome']}
          columns={[
            { key: 'discente_nome', label: 'Discente' },
            { key: 'pelotao_nome', label: 'Pelotão' },
            { key: 'disciplina_nome', label: 'Disciplina' },
            ...(user?.role === 'CONTROLADOR_GERAL' ? [{
              key: 'resultado', label: 'Resultado',
              render: (r: Record<string, unknown>) => String(r.situacao ?? r.nota_final ?? '—'),
            }] : []),
            { key: 'tipo_lancamento', label: 'Lançado por', render: (r) => getTipoLancamentoLabel(r.tipo_lancamento as string) },
            { key: 'created_at', label: 'Data', render: (r) => formatDateTime(r.created_at as string) },
          ]}
        />
      );
    }

    if (tipo === 'pelotao_resumo' && data && typeof data === 'object' && 'ranking' in (data as object)) {
      const d = data as { ranking: Array<Record<string, unknown>>; notas: Array<Record<string, unknown>> };
      return (
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Ranking</h3>
            <DataTable
              data={d.ranking}
              searchKeys={['nome']}
              columns={[
                { key: 'posicao', label: 'Pos.' },
                { key: 'nome', label: 'Nome' },
                { key: 'pontos_obtidos', label: 'Obtidos' },
                { key: 'pontos_distribuidos', label: 'Distribuídos' },
                { key: 'percentual', label: 'Média', render: (r) => formatMedia(r.percentual as number) },
              ]}
            />
          </div>
          <div>
            <h3 className="font-semibold mb-3">Notas Lançadas</h3>
            <DataTable
              data={d.notas}
              searchKeys={['discente_nome', 'disciplina_nome']}
              columns={[
                { key: 'discente_nome', label: 'Discente' },
                { key: 'disciplina_nome', label: 'Disciplina' },
                { key: 'pontos_obtidos', label: 'Obtidos' },
                { key: 'tipo_lancamento', label: 'Lançado por', render: (r) => getTipoLancamentoLabel(r.tipo_lancamento as string) },
                { key: 'created_at', label: 'Data', render: (r) => formatDateTime(r.created_at as string) },
              ]}
            />
          </div>
        </div>
      );
    }

    if (Array.isArray(data)) {
      const arr = data as Array<Record<string, unknown>>;
      if (arr.length === 0) return <p className="text-gray-500">Nenhum dado encontrado.</p>;

      const keys = Object.keys(arr[0]).filter((k) => !k.endsWith('_id') || k === 'discente_id');
      return (
        <DataTable
          data={arr}
          searchKeys={keys.slice(0, 3)}
          columns={keys.slice(0, 8).map((k) => ({
            key: k,
            label: k.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
            render: k === 'percentual_atualizacao'
              ? (r: Record<string, unknown>) => formatPercent(r[k] as number)
              : k.includes('percentual') || k === 'media'
              ? (r: Record<string, unknown>) => formatMedia(r[k] as number)
              : k.includes('created_at') || k.includes('ultima_atualizacao') ? (r: Record<string, unknown>) => formatDateTime(r[k] as string)
              : k === 'tipo_lancamento' ? (r: Record<string, unknown>) => getTipoLancamentoLabel(r[k] as string)
              : undefined,
          }))}
        />
      );
    }

    if (typeof data === 'object' && data !== null) {
      const d = data as Record<string, unknown>;
      if (d.pelotaoStats) {
        return (
          <div className="space-y-4">
            <h3 className="font-semibold">Divergências por Pelotão</h3>
            {(d.pelotaoStats as Array<Record<string, unknown>>).map((p, i) => (
              <div key={i} className={`card ${p.tem_divergencia ? 'border-yellow-300 bg-yellow-50' : ''}`}>
                <p className="font-medium">{p.pelotao_nome as string} — Média: {p.media_pontos as number} pts</p>
                {Boolean(p.tem_divergencia) && <p className="text-yellow-700 text-sm mt-1">Discentes com pontos divergentes detectados</p>}
              </div>
            ))}
            {(d.disciplinasFaltantes as Array<Record<string, unknown>>)?.length > 0 && (
              <div>
                <h3 className="font-semibold mt-4 mb-2">Disciplinas Faltantes</h3>
                {(d.disciplinasFaltantes as Array<Record<string, unknown>>).map((df, i) => (
                  <p key={i} className="text-sm text-gray-600">
                    {df.disciplina as string}: em {df.pelotao_com as string}, ausente em {df.pelotao_sem as string}
                  </p>
                ))}
              </div>
            )}
          </div>
        );
      }
    }

    return <pre className="text-xs overflow-auto">{JSON.stringify(data, null, 2)}</pre>;
  };

  const handleExportPDF = () => {
    if (!data || !Array.isArray(data)) return;
    const arr = data as Array<Record<string, unknown>>;
    if (arr.length === 0) return;
    const keys = Object.keys(arr[0]).slice(0, 6);
    exportTableToPDF(
      reportTypes.find((r) => r.value === tipo)?.label || 'Relatório',
      keys.map((k) => k.replace(/_/g, ' ')),
      arr.map((row) => keys.map((k) => String(row[k] ?? '—')))
    );
  };

  return (
    <AppLayout title="Relatórios">
      <div className="space-y-4">
        <div className="card">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="label">Tipo de Relatório</label>
              <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {availableTypes.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            {['notas_por_pelotao', 'pelotao_resumo', 'notas_lancadas'].includes(tipo) && user?.role === 'CONTROLADOR_GERAL' && (
              <div>
                <label className="label">Pelotão</label>
                <select className="input" value={filtroPelotao} onChange={(e) => setFiltroPelotao(e.target.value)}>
                  <option value="">Todos</option>
                  {pelotoes.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
            )}
            {tipo === 'notas_por_disciplina' && (
              <div>
                <label className="label">Disciplina</label>
                <select className="input" value={filtroDisciplina} onChange={(e) => setFiltroDisciplina(e.target.value)}>
                  <option value="">Selecione...</option>
                  {disciplinas.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={gerar} disabled={loading} className="btn-primary">
              {loading ? 'Gerando...' : 'Gerar Relatório'}
            </button>
            {Array.isArray(data) ? (
              <button onClick={handleExportPDF} className="btn-secondary">Exportar PDF</button>
            ) : null}
          </div>
        </div>

        {data != null ? (
          <div className="card">
            <h3 className="font-semibold mb-4">{reportTypes.find((r) => r.value === tipo)?.label}</h3>
            {renderData()}
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
