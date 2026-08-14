'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, BookOpen, GraduationCap, Trophy,
  FileText, Shield, Database, Upload, Key, LogOut, Menu, X, Settings
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { cn, getRoleLabel } from '@/lib/utils';
import type { UserRole } from '@/lib/types';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { href: '/dashboard/geral', label: 'Painel Geral', icon: <LayoutDashboard size={20} />, roles: ['CONTROLADOR_GERAL'] },
  { href: '/dashboard/pelotao', label: 'Painel Pelotão', icon: <LayoutDashboard size={20} />, roles: ['CONTROLADOR_PELOTÃO'] },
  { href: '/dashboard/discente', label: 'Meu Painel', icon: <LayoutDashboard size={20} />, roles: ['DISCENTE'] },
  { href: '/disciplinas', label: 'Disciplinas', icon: <BookOpen size={20} />, roles: ['CONTROLADOR_GERAL'] },
  { href: '/usuarios', label: 'Usuários', icon: <Users size={20} />, roles: ['CONTROLADOR_GERAL'] },
  { href: '/discentes', label: 'Discentes', icon: <GraduationCap size={20} />, roles: ['CONTROLADOR_GERAL', 'CONTROLADOR_PELOTÃO'] },
  { href: '/notas', label: 'Notas', icon: <FileText size={20} />, roles: ['CONTROLADOR_GERAL', 'CONTROLADOR_PELOTÃO'] },
  { href: '/minhas-notas', label: 'Minhas Notas', icon: <FileText size={20} />, roles: ['DISCENTE'] },
  { href: '/autorizacoes', label: 'Autorizações', icon: <Settings size={20} />, roles: ['CONTROLADOR_PELOTÃO'] },
  { href: '/ranking', label: 'Ranking', icon: <Trophy size={20} />, roles: ['CONTROLADOR_GERAL', 'CONTROLADOR_PELOTÃO', 'DISCENTE'] },
  { href: '/relatorios', label: 'Relatórios', icon: <FileText size={20} />, roles: ['CONTROLADOR_GERAL', 'CONTROLADOR_PELOTÃO'] },
  { href: '/auditoria', label: 'Auditoria', icon: <Shield size={20} />, roles: ['CONTROLADOR_GERAL', 'CONTROLADOR_PELOTÃO'] },
  { href: '/backup', label: 'Backup', icon: <Database size={20} />, roles: ['CONTROLADOR_GERAL'] },
  { href: '/alterar-senha', label: 'Alterar Senha', icon: <Key size={20} />, roles: ['CONTROLADOR_GERAL', 'CONTROLADOR_PELOTÃO', 'DISCENTE'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const filteredItems = navItems.filter((item) => item.roles.includes(user.role));

  const sidebarContent = (
    <>
      <div className="p-5 border-b border-pmmg-black-light bg-pmmg-black-dark">
        <div className="flex items-center gap-3">
          <img
            src="/images/escudo-efas.png"
            alt="Escudo EFAS PMMG"
            width={52}
            height={60}
            className="escudo-efas escudo-on-dark drop-shadow-md"
          />
          <div>
            <h1 className="text-sm font-bold text-pmmg-gold-400 tracking-wide leading-tight">CFS 2026</h1>
            <p className="text-[10px] text-pmmg-gray-400 mt-0.5 uppercase tracking-wider">Controle de Notas</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-pmmg-black-light bg-pmmg-black">
        <p className="text-sm font-semibold text-white truncate">{user.nome}</p>
        <p className="text-xs text-pmmg-gold-400 mt-0.5">{getRoleLabel(user.role)}</p>
      </div>

      <nav className="flex-1 py-3 overflow-y-auto bg-pmmg-black">
        {filteredItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              pathname.startsWith(item.href) ? 'sidebar-link-active' : 'sidebar-link'
            )}
          >
            <span className={pathname.startsWith(item.href) ? 'text-pmmg-gold-400' : 'text-pmmg-gray-400'}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-pmmg-black-light bg-pmmg-black-dark">
        <p className="text-[10px] text-pmmg-gray-500 text-center mb-2 uppercase tracking-wider">
          PMMG — EFAS
        </p>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-red-400 hover:bg-red-950/40 transition-colors uppercase tracking-wide"
        >
          <LogOut size={20} />
          Sair
        </button>
      </div>
    </>
  );

  return (
    <>
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-pmmg-black rounded-lg shadow-pmmg text-pmmg-gold-400 border border-pmmg-gold-400/30"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 w-64 flex flex-col transition-transform lg:translate-x-0 shadow-pmmg',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {sidebarContent}
      </aside>
    </>
  );
}
