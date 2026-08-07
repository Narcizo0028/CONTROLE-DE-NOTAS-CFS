'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import { Plus, Pencil } from 'lucide-react';
import { getRoleLabel } from '@/lib/utils';

interface Usuario {
  id: string; login: string; nome: string; role: string;
  pelotao_nome: string | null; ativo: number;
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [pelotoes, setPelotoes] = useState<Array<{ id: string; nome: string }>>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [form, setForm] = useState({ login: '', nome: '', password: '', role: 'CONTROLADOR_PELOTÃO', pelotao_id: '', nova_senha: '' });
  const [error, setError] = useState('');

  const load = async () => {
    const [uRes, pRes] = await Promise.all([fetch('/api/usuarios'), fetch('/api/pelotoes')]);
    if (uRes.ok) setUsuarios(await uRes.json());
    if (pRes.ok) setPelotoes(await pRes.json());
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ login: '', nome: '', password: '', role: 'CONTROLADOR_PELOTÃO', pelotao_id: '', nova_senha: '' });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (u: Usuario) => {
    setEditing(u);
    setForm({ login: u.login, nome: u.nome, password: '', role: u.role, pelotao_id: '', nova_senha: '' });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setError('');
    const url = editing ? `/api/usuarios/${editing.id}` : '/api/usuarios';
    const method = editing ? 'PUT' : 'POST';
    const body = editing
      ? { nome: form.nome, role: form.role, pelotao_id: form.pelotao_id || undefined, nova_senha: form.nova_senha || undefined }
      : form;

    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setModalOpen(false);
    load();
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Confirma a desativação deste usuário?')) return;
    await fetch(`/api/usuarios/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <AppLayout title="Usuários">
      <div className="space-y-4">
        <div className="flex justify-end">
          <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Novo Usuário</button>
        </div>

        <DataTable
          data={usuarios}
          searchKeys={['login', 'nome', 'role', 'pelotao_nome']}
          columns={[
            { key: 'login', label: 'Login' },
            { key: 'nome', label: 'Nome' },
            { key: 'role', label: 'Perfil', render: (u) => getRoleLabel(u.role) },
            { key: 'pelotao_nome', label: 'Pelotão' },
            { key: 'ativo', label: 'Status', render: (u) => u.ativo ? <span className="badge-green">Ativo</span> : <span className="badge-red">Inativo</span> },
            {
              key: 'actions', label: 'Ações', sortable: false,
              render: (u) => (
                <div className="flex gap-2">
                  <button onClick={() => openEdit(u)} className="text-primary-600"><Pencil size={16} /></button>
                  {u.ativo === 1 && u.role !== 'CONTROLADOR_GERAL' && (
                    <button onClick={() => handleDeactivate(u.id)} className="text-red-600 text-xs">Desativar</button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Usuário' : 'Novo Usuário'}>
        <div className="space-y-4">
          {!editing && (
            <div>
              <label className="label">Login</label>
              <input className="input" value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} />
            </div>
          )}
          <div>
            <label className="label">Nome</label>
            <input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          {!editing && (
            <div>
              <label className="label">Senha</label>
              <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
          )}
          {editing && (
            <div>
              <label className="label">Nova Senha (opcional)</label>
              <input type="password" className="input" value={form.nova_senha} onChange={(e) => setForm({ ...form, nova_senha: e.target.value })} />
            </div>
          )}
          <div>
            <label className="label">Perfil</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="CONTROLADOR_PELOTÃO">Controlador de Pelotão</option>
              <option value="CONTROLADOR_GERAL">Controlador Geral</option>
            </select>
          </div>
          {form.role === 'CONTROLADOR_PELOTÃO' && (
            <div>
              <label className="label">Pelotão</label>
              <select className="input" value={form.pelotao_id} onChange={(e) => setForm({ ...form, pelotao_id: e.target.value })}>
                <option value="">Selecione...</option>
                {pelotoes.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
          )}
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-3 justify-end">
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSave} className="btn-primary">Salvar</button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
