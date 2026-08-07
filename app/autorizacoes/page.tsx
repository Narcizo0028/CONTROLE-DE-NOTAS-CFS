'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/components/AuthProvider';

interface Autorizacao {
  id: string; disciplina_id: string; disciplina_nome: string;
  pontos_distribuidos: number; status: string;
}

export default function AutorizacoesPage() {
  const { user } = useAuth();
  const [autorizacoes, setAutorizacoes] = useState<Autorizacao[]>([]);
  const [disciplinas, setDisciplinas] = useState<Array<{ id: string; nome: string }>>([]);
  const [selectedDisciplina, setSelectedDisciplina] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    const [aRes, dRes] = await Promise.all([
      fetch(`/api/autorizacoes?pelotao_id=${user?.pelotao_id}`),
      fetch('/api/disciplinas'),
    ]);
    if (aRes.ok) setAutorizacoes(await aRes.json());
    if (dRes.ok) setDisciplinas(await dRes.json());
  };

  useEffect(() => { if (user?.pelotao_id) load(); }, [user]);

  const toggleStatus = async (disciplinaId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ATIVA' ? 'BLOQUEADA' : 'ATIVA';
    const res = await fetch('/api/autorizacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pelotao_id: user?.pelotao_id, disciplina_id: disciplinaId, status: newStatus }),
    });
    if (res.ok) {
      setMessage(newStatus === 'ATIVA' ? 'Disciplina autorizada para lançamento pelos discentes' : 'Disciplina bloqueada');
      load();
    }
  };

  const addAutorizacao = async () => {
    if (!selectedDisciplina) return;
    await toggleStatus(selectedDisciplina, 'BLOQUEADA');
    setSelectedDisciplina('');
  };

  const allDisciplinas = disciplinas.map((d) => {
    const aut = autorizacoes.find((a) => a.disciplina_id === d.id);
    return { ...d, status: aut?.status || 'BLOQUEADA', autId: aut?.id };
  });

  return (
    <AppLayout title="Autorizações de Lançamento">
      <div className="space-y-4">
        {message && <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm">{message}</div>}

        <div className="card">
          <h3 className="font-semibold mb-4">Controle de Autorizações por Disciplina</h3>
          <p className="text-sm text-gray-500 mb-4">
            Autorize ou bloqueie o lançamento de notas pelos discentes do seu pelotão.
          </p>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>Disciplina</th><th>Status</th><th>Ação</th></tr>
              </thead>
              <tbody>
                {allDisciplinas.map((d) => (
                  <tr key={d.id}>
                    <td>{d.nome}</td>
                    <td>
                      {d.status === 'ATIVA'
                        ? <span className="badge-green">Autorizada</span>
                        : <span className="badge-red">Bloqueada</span>}
                    </td>
                    <td>
                      <button
                        onClick={() => toggleStatus(d.id, d.status)}
                        className={`text-xs px-3 py-1 rounded-lg ${d.status === 'ATIVA' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                      >
                        {d.status === 'ATIVA' ? 'Bloquear' : 'Autorizar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
