import type { SessionUser, UserRole } from './types';

export function isControladorGeral(user: SessionUser): boolean {
  return user.role === 'CONTROLADOR_GERAL';
}

export function isControladorPelotao(user: SessionUser): boolean {
  return user.role === 'CONTROLADOR_PELOTÃO';
}

export function isDiscente(user: SessionUser): boolean {
  return user.role === 'DISCENTE';
}

export function canAccessPelotao(user: SessionUser, pelotaoId: string): boolean {
  if (isControladorGeral(user)) return true;
  if (isControladorPelotao(user)) return user.pelotao_id === pelotaoId;
  return false;
}

export function canAccessDiscente(user: SessionUser, discentePelotaoId: string, discenteId?: string): boolean {
  if (isControladorGeral(user)) return true;
  if (isControladorPelotao(user)) return user.pelotao_id === discentePelotaoId;
  if (isDiscente(user)) return user.discente_id === discenteId;
  return false;
}

export function canManageUsers(user: SessionUser): boolean {
  return isControladorGeral(user);
}

export function canManageDisciplinas(user: SessionUser): boolean {
  return isControladorGeral(user);
}

export function canManageNotas(user: SessionUser, pelotaoId?: string): boolean {
  if (isControladorGeral(user)) return true;
  if (isControladorPelotao(user) && pelotaoId) return user.pelotao_id === pelotaoId;
  return false;
}

export function canLaunchNotaAsDiscente(user: SessionUser, discenteId: string): boolean {
  return isDiscente(user) && user.discente_id === discenteId;
}

export function getAccessiblePelotaoId(user: SessionUser): string | null {
  if (isControladorGeral(user)) return null;
  return user.pelotao_id;
}

export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  '/dashboard/geral': ['CONTROLADOR_GERAL'],
  '/dashboard/pelotao': ['CONTROLADOR_PELOTÃO'],
  '/dashboard/discente': ['DISCENTE'],
  '/disciplinas': ['CONTROLADOR_GERAL'],
  '/usuarios': ['CONTROLADOR_GERAL'],
  '/ranking': ['CONTROLADOR_GERAL', 'CONTROLADOR_PELOTÃO', 'DISCENTE'],
  '/relatorios': ['CONTROLADOR_GERAL', 'CONTROLADOR_PELOTÃO'],
  '/auditoria': ['CONTROLADOR_GERAL', 'CONTROLADOR_PELOTÃO'],
  '/backup': ['CONTROLADOR_GERAL'],
  '/discentes': ['CONTROLADOR_GERAL', 'CONTROLADOR_PELOTÃO'],
  '/discentes/importacao': ['CONTROLADOR_GERAL'],
  '/notas': ['CONTROLADOR_GERAL', 'CONTROLADOR_PELOTÃO', 'DISCENTE'],
  '/autorizacoes': ['CONTROLADOR_PELOTÃO'],
  '/importacao': ['CONTROLADOR_PELOTÃO'],
  '/minhas-notas': ['DISCENTE'],
  '/alterar-senha': ['CONTROLADOR_GERAL', 'CONTROLADOR_PELOTÃO', 'DISCENTE'],
};

export function canAccessRoute(user: SessionUser, pathname: string): boolean {
  const basePath = Object.keys(ROUTE_PERMISSIONS).find((route) => pathname.startsWith(route));
  if (!basePath) return true;
  return ROUTE_PERMISSIONS[basePath].includes(user.role);
}

export function getDashboardPath(role: UserRole): string {
  switch (role) {
    case 'CONTROLADOR_GERAL':
      return '/dashboard/geral';
    case 'CONTROLADOR_PELOTÃO':
      return '/dashboard/pelotao';
    case 'DISCENTE':
      return '/dashboard/discente';
    default:
      return '/login';
  }
}
