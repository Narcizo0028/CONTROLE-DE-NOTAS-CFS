'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import ImportacaoNotas from '@/components/ImportacaoNotas';
import NotaForm, { NotaFormInline } from '@/components/NotaForm';
import { useAuth } from '@/components/AuthProvider';
import type { Disciplina, LancamentoNota } from '@/lib/types';

interface Discente { id: string; nome: string; matricula: string; pelotao_id: string; }

export default function NotasPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'individual' | 'coletivo' | 'importacao'>('individual');
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [discentes, setDiscentes] = useState<Discente[]>([]);
  const [pelotoes, setPelotoes] = useState<Array<{ id: string; nome: string }>>([]);
  const [selDiscente, setSelDiscente] = useState('');
  const [selDisciplina, setSelDisciplina] = useState<Disciplina | null>(null);
  const [valores, setValores] = useState<LancamentoNota>({});
  const [coletivoDisciplina, setColetivoDisciplina] = useState<Disciplina | null>(null);
  const [coletivoNotas, setColetivoNotas] = useState<Record<string, LancamentoNota>>({});
  const [coletivoPelotaoId, setColetivoPelotaoId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const response = await fetch('/api/notas/inicial');
    if (!response.ok) return;
    const data = await response.json();
    setDisciplinas(data.disciplinas);
    setDiscentes(data.discentes);
  };

  useEffect(() => {
    load();
    if (user?.role === 'CONTROLADOR_GERAL') fetch('/api/pelotoes').then(async (res) => { if (res.ok) setPelotoes(await res.json()); });
  }, [user?.role]);

  const handleIndividual = async () => {
    setError(''); setSuccess('');
    if (!selDiscente || !selDisciplina) { setError('Selecione discente e disciplina'); return; }

    setSaving(true);
    const res = await fetch('/api/notas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discente_id: selDiscente, disciplina_id: selDisciplina.id, ...valores }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setSaving(false); return; }
    setSuccess(data.updated ? `Nota atualizada: ${data.resumo}` : `Nota lançada: ${data.resumo}`);
    setValores({});
    setSaving(false);
  };

  const handleColetivo = async () => {
    setError(''); setSuccess('');
    if (!coletivoDisciplina) { setError('Selecione a disciplina'); return; }

    const notasList = Object.entries(coletivoNotas)
      .filter(([, v]) => Object.values(v).some((x) => x !== undefined && x !== null && x !== ''))
      .map(([discente_id, campos]) => ({ discente_id, ...campos }));

    if (notasList.length === 0) { setError('Informe ao menos uma nota'); return; }

    const res = await fetch('/api/notas/coletivo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pelotao_id: user?.role === 'CONTROLADOR_GERAL' ? coletivoPelotaoId : user?.pelotao_id,
        disciplina_id: coletivoDisciplina.id,
        notas: notasList,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setSuccess(`${data.created} criadas, ${data.updated} atualizadas${data.errors?.length ? `. Erros: ${data.errors.join('; ')}` : ''}`);
    setColetivoNotas({});
  };

  return (
    <AppLayout title="Lançamento de Notas">
      <div className="space-y-4">
        <div className="flex gap-2 border-b border-gray-200 pb-2 flex-wrap">
          {(['individual', 'coletivo', 'importacao'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold uppercase tracking-wide ${tab === t ? 'bg-pmmg-gold-400 text-pmmg-black' : 'text-pmmg-gray-600 hover:bg-pmmg-khaki-100'}`}>
              {t === 'individual' ? 'Individual' : t === 'coletivo' ? 'Coletivo por Disciplina' : 'Importação JSON'}
            </button>
          ))}
        </div>

        {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
        {success && <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm">{success}</div>}

        {tab === 'individual' && (
          <div className="card space-y-4 max-w-2xl">
            <div>
              <label className="label">Discente</label>
              <select className="input" value={selDiscente} onChange={(e) => setSelDiscente(e.target.value)}>
                <option value="">Selecione...</option>
                {discentes.map((d) => <option key={d.id} value={d.id}>{d.matricula} — {d.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Disciplina</label>
              <select className="input" value={selDisciplina?.id || ''} onChange={(e) => {
                const d = disciplinas.find((x) => x.id === e.target.value) || null;
                setSelDisciplina(d);
                setValores({});
              }}>
                <option value="">Selecione...</option>
                {disciplinas.map((d) => <option key={d.id} value={d.id}>{d.ordem}. {d.nome}</option>)}
              </select>
            </div>
            <NotaForm disciplina={selDisciplina} valores={valores} onChange={setValores} />
            <button onClick={handleIndividual} className="btn-primary" disabled={saving || !selDiscente || !selDisciplina}>
              Lançar Nota
            </button>
          </div>
        )}

        {tab === 'coletivo' && (
          <div className="card space-y-4">
            {user?.role === 'CONTROLADOR_GERAL' && <div><label className="label">Pelotão</label><select className="input max-w-lg" value={coletivoPelotaoId} onChange={(e) => { setColetivoPelotaoId(e.target.value); setColetivoNotas({}); }}><option value="">Selecione...</option>{pelotoes.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>}
            <div>
              <label className="label">Disciplina</label>
              <select className="input max-w-lg" value={coletivoDisciplina?.id || ''} onChange={(e) => {
                setColetivoDisciplina(disciplinas.find((x) => x.id === e.target.value) || null);
                setColetivoNotas({});
              }}>
                <option value="">Selecione...</option>
                {disciplinas.map((d) => <option key={d.id} value={d.id}>{d.ordem}. {d.nome}</option>)}
              </select>
            </div>
            {coletivoDisciplina && (
              <div className="table-container overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>Matrícula</th><th>Nome</th><th>Lançamento</th></tr></thead>
                  <tbody>
                    {discentes.filter((d) => d.pelotao_id === (user?.role === 'CONTROLADOR_GERAL' ? coletivoPelotaoId : user?.pelotao_id)).map((d) => (
                      <tr key={d.id}>
                        <td>{d.matricula}</td>
                        <td>{d.nome}</td>
                        <td>
                          <NotaFormInline
                            disciplina={coletivoDisciplina}
                            valores={coletivoNotas[d.id] || {}}
                            onChange={(v) => setColetivoNotas({ ...coletivoNotas, [d.id]: v })}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button onClick={handleColetivo} className="btn-primary" disabled={!coletivoDisciplina || (user?.role === 'CONTROLADOR_GERAL' && !coletivoPelotaoId)}>
              Lançar Notas Coletivas
            </button>
          </div>
        )}

        {tab === 'importacao' && <ImportacaoNotas />}
      </div>
    </AppLayout>
  );
}
