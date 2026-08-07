'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import DataTable from '@/components/DataTable';
import { formatDateTime, getActionLabel, getRoleLabel } from '@/lib/utils';
import { exportTableToPDF } from '@/lib/pdf-export';

interface AuditEntry {
  id: string; user_nome: string; user_role: string; acao: string;
  valor_anterior: string | null; valor_novo: string | null;
  motivo: string | null; created_at: string;
}

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [filtroAcao, setFiltroAcao] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let url = '/api/auditoria?limit=200';
    if (filtroAcao) url += `&acao=${filtroAcao}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filtroAcao]);

  const handleExportPDF = () => {
    exportTableToPDF(
      'Relatório de Auditoria — CFS 2026',
      ['Data', 'Usuário', 'Perfil', 'Ação', 'Anterior', 'Novo', 'Motivo'],
      logs.map((l) => [
        formatDateTime(l.created_at),
        l.user_nome || '—',
        l.user_role ? getRoleLabel(l.user_role) : '—',
        getActionLabel(l.acao),
        l.valor_anterior || '—',
        l.valor_novo || '—',
        l.motivo || '—',
      ])
    );
  };

  return (
    <AppLayout title="Auditoria">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3 justify-between items-center">
          <div className="flex gap-3 items-center">
            <select className="input w-auto" value={filtroAcao} onChange={(e) => setFiltroAcao(e.target.value)}>
              <option value="">Todas as ações</option>
              {['CADASTRO', 'EDICAO', 'LANCAMENTO', 'CORRECAO', 'EXCLUSAO', 'IMPORTACAO', 'AUTORIZACAO', 'BLOQUEIO', 'LOGIN', 'LOGIN_FALHA', 'REDEFINICAO_SENHA', 'BACKUP', 'RESTAURACAO'].map((a) => (
                <option key={a} value={a}>{getActionLabel(a)}</option>
              ))}
            </select>
            <span className="text-sm text-gray-500">{total} registro(s) total</span>
          </div>
          <button onClick={handleExportPDF} className="btn-secondary">Exportar PDF</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
          </div>
        ) : (
          <DataTable
            data={logs}
            searchKeys={['user_nome', 'acao', 'motivo', 'valor_anterior', 'valor_novo']}
            pageSize={15}
            columns={[
              { key: 'created_at', label: 'Data/Hora', render: (l) => formatDateTime(l.created_at) },
              { key: 'user_nome', label: 'Usuário' },
              { key: 'user_role', label: 'Perfil', render: (l) => l.user_role ? getRoleLabel(l.user_role) : '—' },
              { key: 'acao', label: 'Ação', render: (l) => getActionLabel(l.acao) },
              { key: 'valor_anterior', label: 'Anterior', render: (l) => <span className="text-xs max-w-[120px] truncate block">{l.valor_anterior || '—'}</span> },
              { key: 'valor_novo', label: 'Novo', render: (l) => <span className="text-xs max-w-[120px] truncate block">{l.valor_novo || '—'}</span> },
              { key: 'motivo', label: 'Motivo', render: (l) => <span className="text-xs">{l.motivo || '—'}</span> },
            ]}
          />
        )}
      </div>
    </AppLayout>
  );
}
