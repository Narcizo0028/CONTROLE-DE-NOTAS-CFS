'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import Modal from '@/components/Modal';
import NotaForm, { NotaFormInline } from '@/components/NotaForm';
import { useAuth } from '@/components/AuthProvider';
import { formatDateTime, getTipoLancamentoLabel } from '@/lib/utils';
import type { Disciplina, LancamentoNota } from '@/lib/types';

interface Discente { id: string; nome: string; matricula: string; }
interface NotaRow {
  id: string; discente_id: string; disciplina_id: string;
  discente_nome: string; disciplina_nome: string; tipo_avaliacao: string;
  trabalho: number | null; trabalho_1: number | null; trabalho_2: number | null;
  avc: number | null; avf: number | null; situacao: string | null;
  nota_final: number | null; tipo_lancamento: string; created_at: string;
}

export default function NotasPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'individual' | 'coletivo' | 'lista'>('individual');
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [discentes, setDiscentes] = useState<Discente[]>([]);
  const [notas, setNotas] = useState<NotaRow[]>([]);
  const [selDiscente, setSelDiscente] = useState('');
  const [selDisciplina, setSelDisciplina] = useState<Disciplina | null>(null);
  const [valores, setValores] = useState<LancamentoNota>({});
  const [coletivoDisciplina, setColetivoDisciplina] = useState<Disciplina | null>(null);
  const [coletivoNotas, setColetivoNotas] = useState<Record<string, LancamentoNota>>({});
  const [editModal, setEditModal] = useState<NotaRow | null>(null);
  const [editValores, setEditValores] = useState<LancamentoNota>({});
  const [editDisciplina, setEditDisciplina] = useState<Disciplina | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const response = await fetch('/api/notas/inicial');
    if (!response.ok) return;
    const data = await response.json();
    setDisciplinas(data.disciplinas);
    setDiscentes(data.discentes);
    setNotas(data.notas);
  };

  const refreshNotas = async () => {
    const response = await fetch('/api/notas');
    if (response.ok) setNotas(await response.json());
  };

  useEffect(() => { load(); }, []);

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
    refreshNotas();
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
        pelotao_id: user?.pelotao_id,
        disciplina_id: coletivoDisciplina.id,
        notas: notasList,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setSuccess(`${data.created} criadas, ${data.updated} atualizadas${data.errors?.length ? `. Erros: ${data.errors.join('; ')}` : ''}`);
    setColetivoNotas({});
    refreshNotas();
  };

  const openEdit = (n: NotaRow) => {
    const disc = disciplinas.find((d) => d.id === n.disciplina_id) || null;
    setEditDisciplina(disc);
    setEditValores({
      trabalho: n.trabalho, trabalho_1: n.trabalho_1, trabalho_2: n.trabalho_2,
      avc: n.avc, avf: n.avf, situacao: n.situacao as LancamentoNota['situacao'],
    });
    setEditModal(n);
  };

  const handleEdit = async () => {
    if (!editModal) return;
    const res = await fetch(`/api/notas/${editModal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editValores),
    });
    if (res.ok) { setEditModal(null); refreshNotas(); }
    else { const d = await res.json(); alert(d.error); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Confirma a exclusão desta nota?')) return;
    await fetch(`/api/notas/${id}`, { method: 'DELETE' });
    refreshNotas();
  };

  const resumoNota = (n: NotaRow) => {
    if (n.situacao) return n.situacao;
    const parts: string[] = [];
    if (n.trabalho != null) parts.push(`T:${n.trabalho}`);
    if (n.trabalho_1 != null) parts.push(`T1:${n.trabalho_1}`);
    if (n.trabalho_2 != null) parts.push(`T2:${n.trabalho_2}`);
    if (n.avc != null) parts.push(`AVC:${n.avc}`);
    if (n.avf != null) parts.push(`AVF:${n.avf}`);
    return parts.length ? `${parts.join('+')}=${n.nota_final}` : '—';
  };

  return (
    <AppLayout title="Lançamento de Notas">
      <div className="space-y-4">
        <div className="flex gap-2 border-b border-gray-200 pb-2 flex-wrap">
          {(['individual', 'coletivo', 'lista'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold uppercase tracking-wide ${tab === t ? 'bg-pmmg-gold-400 text-pmmg-black' : 'text-pmmg-gray-600 hover:bg-pmmg-khaki-100'}`}>
              {t === 'individual' ? 'Individual' : t === 'coletivo' ? 'Coletivo por Disciplina' : 'Notas Lançadas'}
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
                    {discentes.map((d) => (
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
            <button onClick={handleColetivo} className="btn-primary" disabled={!coletivoDisciplina}>
              Lançar Notas Coletivas
            </button>
          </div>
        )}

        {tab === 'lista' && (
          <div className="table-container">
            <table className="data-table text-xs">
              <thead>
                <tr>
                  <th>Discente</th><th>Disciplina</th><th>Resultado</th>
                  <th>Lançado por</th><th>Data</th><th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {notas.map((n) => (
                  <tr key={n.id}>
                    <td>{n.discente_nome}</td>
                    <td>{n.disciplina_nome}</td>
                    <td className="font-medium">{resumoNota(n)}</td>
                    <td><span className="badge-blue">{getTipoLancamentoLabel(n.tipo_lancamento)}</span></td>
                    <td>{formatDateTime(n.created_at)}</td>
                    <td>
                      <button onClick={() => openEdit(n)} className="text-primary-600 mr-2">Editar</button>
                      <button onClick={() => handleDelete(n.id)} className="text-red-600">Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Corrigir Nota">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{editModal?.discente_nome} — {editModal?.disciplina_nome}</p>
          <NotaForm disciplina={editDisciplina} valores={editValores} onChange={setEditValores} />
          <div className="flex gap-3 justify-end">
            <button onClick={() => setEditModal(null)} className="btn-secondary">Cancelar</button>
            <button onClick={handleEdit} className="btn-primary">Salvar Correção</button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
