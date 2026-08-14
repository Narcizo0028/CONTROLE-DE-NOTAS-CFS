'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import { Plus, Pencil, Trash2, Upload } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

interface Discente {
  id: string; nome: string; matricula: string; posto_graduacao: string; pelotao_nome: string;
}

export default function DiscentesPage() {
  const { user } = useAuth();
  const [discentes, setDiscentes] = useState<Discente[]>([]);
  const [pelotoes, setPelotoes] = useState<Array<{ id: string; nome: string }>>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Discente | null>(null);
  const [form, setForm] = useState({
    nome: '', matricula: '', pelotao_id: '',
    criar_login: true, login: '', senha: 'discente123',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const load = async () => {
    const [dRes, pRes] = await Promise.all([fetch('/api/discentes'), fetch('/api/pelotoes')]);
    if (dRes.ok) { setDiscentes(await dRes.json()); setSelectedIds([]); }
    if (pRes.ok) {
      const ps = await pRes.json();
      setPelotoes(ps);
      if (user?.pelotao_id && !form.pelotao_id) {
        setForm((f) => ({ ...f, pelotao_id: user.pelotao_id! }));
      }
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      nome: '', matricula: '', pelotao_id: user?.pelotao_id || '',
      criar_login: true, login: '', senha: 'discente123',
    });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (d: Discente) => {
    setEditing(d);
    setForm({ ...form, nome: d.nome, matricula: d.matricula });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
    if (editing) {
      const res = await fetch(`/api/discentes/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: form.nome, matricula: form.matricula }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Não foi possível atualizar o discente.'); return; }
    } else {
      const res = await fetch('/api/discentes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Não foi possível cadastrar o discente.'); return; }
    }
    setModalOpen(false);
    load();
    } catch {
      setError('Falha de conexão. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Confirma a exclusão deste discente e todas as suas notas?')) return;
    const res = await fetch(`/api/discentes/${id}`, { method: 'DELETE' });
    if (res.ok) load();
    else { const d = await res.json(); alert(d.error); }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Confirma a exclusão de ${selectedIds.length} discente(s) selecionado(s) e todas as suas notas?`)) return;
    const res = await fetch('/api/discentes/excluir-em-lote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selectedIds }) });
    if (res.ok) load();
    else { const data = await res.json(); alert(data.error || 'Não foi possível excluir os discentes selecionados.'); }
  };

  return (
    <AppLayout title="Discentes">
      <div className="space-y-4">
        <div className="flex justify-end gap-3">
          {user?.role === 'CONTROLADOR_GERAL' && (
            <Link href="/discentes/importacao" className="btn-secondary">
              <Upload size={16} /> Importar JSON
            </Link>
          )}
          {user?.role === 'CONTROLADOR_GERAL' && selectedIds.length > 0 && (
            <button onClick={handleBulkDelete} className="btn-secondary text-red-600">
              <Trash2 size={16} /> Excluir selecionados ({selectedIds.length})
            </button>
          )}
          <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Novo Discente</button>
        </div>

        <DataTable
          data={discentes}
          searchKeys={['nome', 'matricula', 'pelotao_nome']}
          columns={[
            { key: 'matricula', label: 'Matrícula' },
            { key: 'nome', label: 'Nome' },
            { key: 'posto_graduacao', label: 'Posto/Graduação' },
            { key: 'pelotao_nome', label: 'Pelotão' },
            {
              key: 'actions', label: 'Ações', sortable: false,
              render: (d) => (
                <div className="flex gap-2">
                  <button onClick={() => openEdit(d)} className="text-primary-600"><Pencil size={16} /></button>
                  <button onClick={() => handleDelete(d.id)} className="text-red-600"><Trash2 size={16} /></button>
                </div>
              ),
            },
          ]}
          selectedIds={user?.role === 'CONTROLADOR_GERAL' ? selectedIds : undefined}
          onSelectionChange={user?.role === 'CONTROLADOR_GERAL' ? setSelectedIds : undefined}
          getRowId={user?.role === 'CONTROLADOR_GERAL' ? (d) => d.id : undefined}
        />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Discente' : 'Novo Discente'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Nome</label>
              <input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div>
              <label className="label">Matrícula</label>
              <input className="input" value={form.matricula} onChange={(e) => setForm({ ...form, matricula: e.target.value })} />
            </div>
            {!editing && user?.role === 'CONTROLADOR_GERAL' && (
              <div>
                <label className="label">Pelotão</label>
                <select className="input" value={form.pelotao_id} onChange={(e) => setForm({ ...form, pelotao_id: e.target.value })}>
                  <option value="">Selecione...</option>
                  {pelotoes.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
            )}
          </div>
          {!editing && (
            <div className="border-t pt-4">
              <label className="flex items-center gap-2 mb-3">
                <input type="checkbox" checked={form.criar_login} onChange={(e) => setForm({ ...form, criar_login: e.target.checked })} />
                <span className="text-sm">Criar login para o discente</span>
              </label>
              {form.criar_login && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Login</label>
                    <input className="input" value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Senha</label>
                    <input className="input" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} />
                  </div>
                </div>
              )}
            </div>
          )}
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-3 justify-end">
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
