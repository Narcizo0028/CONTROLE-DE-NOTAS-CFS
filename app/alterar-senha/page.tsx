'use client';

import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Key } from 'lucide-react';

export default function AlterarSenhaPage() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (form.newPassword.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
    } else {
      setSuccess('Senha alterada com sucesso!');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }
    setLoading(false);
  };

  return (
    <AppLayout title="Alterar Senha">
      <div className="max-w-md">
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <Key className="text-primary-600" size={24} />
            <h2 className="text-lg font-semibold">Alterar Senha de Acesso</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Senha Atual</label>
              <input
                type="password"
                className="input"
                value={form.currentPassword}
                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Nova Senha</label>
              <input
                type="password"
                className="input"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="label">Confirmar Nova Senha</label>
              <input
                type="password"
                className="input"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                required
              />
            </div>

            {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
            {success && <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm">{success}</div>}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Alterando...' : 'Alterar Senha'}
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
