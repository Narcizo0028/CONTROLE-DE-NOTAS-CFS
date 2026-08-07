'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ login: login.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao fazer login');
        return;
      }

      const role = data.user.role;
      if (role === 'CONTROLADOR_GERAL') window.location.href = '/dashboard/geral';
      else if (role === 'CONTROLADOR_PELOTÃO') window.location.href = '/dashboard/pelotao';
      else window.location.href = '/dashboard/discente';
    } catch {
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-pmmg-gradient p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-1 bg-pmmg-gold-400" />
        <div className="absolute bottom-0 left-0 w-full h-1 bg-pmmg-gold-400" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-6">
            <img
              src="/images/escudo-efas.png"
              alt="Escudo EFAS PMMG"
              width={120}
              height={138}
              className="escudo-efas escudo-on-dark drop-shadow-2xl"
            />
          </div>
          <h1 className="text-xl font-bold text-pmmg-gold-400 uppercase tracking-widest">
            Acesso ao Sistema
          </h1>
          <p className="text-pmmg-gray-300 mt-2 text-sm uppercase tracking-wide">
            Controle de Notas — CFS 2026
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-pmmg-khaki-50 rounded-2xl shadow-pmmg border-2 border-pmmg-gold-400/40 p-8 space-y-5">
          <div className="rounded-lg border border-pmmg-khaki-300 bg-white/80 p-3 text-xs text-pmmg-gray-700 space-y-1">
            <p className="font-semibold text-pmmg-black uppercase tracking-wide">Acessos de demonstração</p>
            <p><span className="font-semibold">Geral:</span> admin.geral / admin123</p>
            <p><span className="font-semibold">Pelotão:</span> ctrl.pelotao1 / pelotao1</p>
            <p><span className="font-semibold">Discente:</span> disc.2026001 / discente123</p>
          </div>

          <div>
            <label className="label">Usuário</label>
            <input
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className="input"
              placeholder="admin.geral"
              autoComplete="username"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pr-10"
                placeholder="Sua senha"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-pmmg-gray-400 hover:text-pmmg-black"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-pmmg-gray-400 text-xs mt-6 uppercase tracking-wider">
          Curso de Formação de Sargentos — PMMG/EFAS 2026
        </p>
      </div>
    </div>
  );
}
