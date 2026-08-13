'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import NotaForm from '@/components/NotaForm';
import { useAuth } from '@/components/AuthProvider';
import { formatMedia, calcMedia } from '@/lib/utils';
import type { Disciplina, LancamentoNota } from '@/lib/types';

interface NotaRow {
  id: string; disciplina_nome: string; disciplina_id: string;
  tipo_avaliacao: string; situacao: string | null; nota_final: number | null;
  pontos_obtidos: number; pontos_distribuidos: number; participa_media: number;
}

interface Autorizacao {
  disciplina_id: string; disciplina_nome: string;
}

export default function MinhasNotasPage() {
  const { user } = useAuth();
  const [notas, setNotas] = useState<NotaRow[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [autorizacoes, setAutorizacoes] = useState<Autorizacao[]>([]);
  const [selDisciplina, setSelDisciplina] = useState<Disciplina | null>(null);
  const [valores, setValores] = useState<LancamentoNota>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    const [nRes, aRes, dRes] = await Promise.all([
      fetch('/api/notas'),
      fetch('/api/autorizacoes'),
      fetch('/api/disciplinas'),
    ]);
    if (nRes.ok) setNotas(await nRes.json());
    if (aRes.ok) setAutorizacoes(await aRes.json());
    if (dRes.ok) setDisciplinas(await dRes.json());
  };

  useEffect(() => { load(); }, []);

  const disciplinasAutorizadas = disciplinas.filter((d) =>
    autorizacoes.some((a) => a.disciplina_id === d.id)
  );

  const handleLaunch = async () => {
    setError(''); setSuccess('');
    if (!selDisciplina) { setError('Selecione uma disciplina'); return; }

    const res = await fetch('/api/notas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discente_id: user?.discente_id,
        disciplina_id: selDisciplina.id,
        ...valores,
        motivo: 'Lançamento pelo discente',
      }),
    });

    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setSuccess(`Lançamento realizado: ${data.resumo}`);
    setValores({});
    setSelDisciplina(null);
    load();
  };

  const resumo = (n: NotaRow) => n.situacao || (n.nota_final != null ? String(n.nota_final) : '—');

  const notasNumericas = notas.filter((n) => n.participa_media);

  return (
    <AppLayout title="Minhas Notas">
      <div className="space-y-6">
        {disciplinasAutorizadas.length > 0 && (
          <div className="card">
            <h3 className="font-semibold mb-4">Lançar Nota (Disciplinas Autorizadas)</h3>
            <div className="space-y-4 max-w-xl">
              <div>
                <label className="label">Disciplina</label>
                <select className="input" value={selDisciplina?.id || ''} onChange={(e) => {
                  setSelDisciplina(disciplinas.find((d) => d.id === e.target.value) || null);
                  setValores({});
                }}>
                  <option value="">Selecione...</option>
                  {disciplinasAutorizadas.map((d) => (
                    <option key={d.id} value={d.id}>{d.nome}</option>
                  ))}
                </select>
              </div>
              <NotaForm disciplina={selDisciplina} valores={valores} onChange={setValores} />
              <button onClick={handleLaunch} className="btn-primary" disabled={!selDisciplina}>Lançar</button>
            </div>
            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
            {success && <p className="text-green-600 text-sm mt-2">{success}</p>}
          </div>
        )}

        <div className="card">
          <h3 className="font-semibold mb-4">Minhas Notas</h3>
          {notas.length === 0 ? (
            <p className="text-gray-500 text-sm">Nenhuma nota lançada.</p>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr><th>Disciplina</th><th>Resultado</th><th>Total</th><th>Média</th></tr>
                </thead>
                <tbody>
                  {notas.map((n) => (
                    <tr key={n.id}>
                      <td>{n.disciplina_nome}</td>
                      <td>{resumo(n)}</td>
                      <td>{n.participa_media ? `${n.pontos_obtidos}/${n.pontos_distribuidos}` : '—'}</td>
                      <td>
                        {n.participa_media
                          ? formatMedia(calcMedia(n.pontos_obtidos, n.pontos_distribuidos))
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {notasNumericas.length > 0 && (
          <div className="card bg-primary-50 border-primary-200">
            <p className="text-sm text-primary-800">
              Média geral (disciplinas numéricas):{' '}
              <strong>
                {formatMedia(
                  calcMedia(
                    notasNumericas.reduce((s, n) => s + n.pontos_obtidos, 0),
                    notasNumericas.reduce((s, n) => s + n.pontos_distribuidos, 0)
                  )
                )}
              </strong>
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
