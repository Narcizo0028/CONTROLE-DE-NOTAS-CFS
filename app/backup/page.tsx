'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { formatDateTime } from '@/lib/utils';
import { Download, Upload, Database, RefreshCw } from 'lucide-react';

interface Backup {
  id: string; filename: string; tipo: string; descricao: string;
  created_by_nome: string; created_at: string;
}

export default function BackupPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    const res = await fetch('/api/backup');
    if (res.ok) setBackups(await res.json());
  };

  useEffect(() => { load(); }, []);

  const createBackup = async () => {
    setLoading(true); setMessage('');
    const res = await fetch('/api/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create' }),
    });
    const data = await res.json();
    setMessage(res.ok ? `Backup criado: ${data.filename}` : data.error);
    setLoading(false);
    load();
  };

  const exportJSON = async () => {
    const res = await fetch('/api/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'export' }),
    });
    if (res.ok) {
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cfs2026_export_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage('Dados exportados com sucesso');
    }
  };

  const restoreBackup = async (id: string, filename: string) => {
    if (!confirm(`Confirma a restauração do backup "${filename}"? Um backup automático será criado antes.`)) return;
    setLoading(true); setMessage('');
    const res = await fetch('/api/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restore', backup_id: id }),
    });
    const data = await res.json();
    setMessage(res.ok ? 'Backup restaurado com sucesso' : data.error);
    setLoading(false);
    load();
  };

  return (
    <AppLayout title="Backup e Restauração">
      <div className="space-y-6">
        {message && (
          <div className={`p-3 rounded-lg text-sm ${message.includes('sucesso') || message.includes('criado') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button onClick={createBackup} disabled={loading} className="card hover:shadow-md transition-shadow text-left">
            <Database className="text-primary-600 mb-2" size={24} />
            <h3 className="font-semibold">Criar Backup</h3>
            <p className="text-sm text-gray-500 mt-1">Salvar snapshot completo do banco</p>
          </button>
          <button onClick={exportJSON} className="card hover:shadow-md transition-shadow text-left">
            <Download className="text-green-600 mb-2" size={24} />
            <h3 className="font-semibold">Exportar JSON</h3>
            <p className="text-sm text-gray-500 mt-1">Baixar dados em formato JSON</p>
          </button>
          <button onClick={load} className="card hover:shadow-md transition-shadow text-left">
            <RefreshCw className="text-gray-600 mb-2" size={24} />
            <h3 className="font-semibold">Atualizar Lista</h3>
            <p className="text-sm text-gray-500 mt-1">Recarregar backups disponíveis</p>
          </button>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-4">Histórico de Backups</h3>
          {backups.length === 0 ? (
            <p className="text-gray-500 text-sm">Nenhum backup encontrado.</p>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr><th>Arquivo</th><th>Tipo</th><th>Criado por</th><th>Data</th><th>Ações</th></tr>
                </thead>
                <tbody>
                  {backups.map((b) => (
                    <tr key={b.id}>
                      <td>{b.filename}</td>
                      <td><span className="badge-blue">{b.tipo}</span></td>
                      <td>{b.created_by_nome || '—'}</td>
                      <td>{formatDateTime(b.created_at)}</td>
                      <td>
                        {b.tipo !== 'RESTAURACAO' && (
                          <button
                            onClick={() => restoreBackup(b.id, b.filename)}
                            className="text-primary-600 text-xs flex items-center gap-1"
                          >
                            <Upload size={14} /> Restaurar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
