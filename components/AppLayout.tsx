'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import { useAuth } from './AuthProvider';
import { getRoleLabel } from '@/lib/utils';

export default function AppLayout({ children, title }: { children: ReactNode; title?: string }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-pmmg-khaki-50">
        <img src="/images/escudo-efas.png" alt="EFAS" width={64} height={74} className="escudo-efas mb-4 opacity-80" />
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pmmg-gold-400" />
      </div>
    );
  }

  if (!user) return null;

  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-pmmg-khaki-50">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen">
        <header className="page-header px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="pl-10 lg:pl-0">
              {title && <h1 className="text-base sm:text-lg font-bold uppercase tracking-wide leading-tight">{title}</h1>}
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 text-sm">
              <span className="text-pmmg-gray-300 text-xs sm:text-sm hidden sm:inline">{today}</span>
              <div className="flex items-center gap-2 bg-pmmg-black-light px-2.5 py-1.5 sm:px-3 rounded-lg border border-pmmg-gold-400/30 max-w-[200px] sm:max-w-none">
                <img src="/images/escudo-efas.png" alt="" width={24} height={28} className="escudo-efas escudo-on-dark shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-pmmg-gold-400 leading-tight truncate">{user.nome}</p>
                  <p className="text-[10px] text-pmmg-gray-400 truncate">{getRoleLabel(user.role)}</p>
                </div>
              </div>
            </div>
          </div>
        </header>
        <div className="p-3 sm:p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
