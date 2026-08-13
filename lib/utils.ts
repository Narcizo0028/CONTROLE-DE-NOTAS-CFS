import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return dateStr;
  }
}

export function converterNumero(valor: unknown): number {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;

  return (
    Number(
      String(valor ?? 0)
        .replace(/\./g, '')
        .replace(',', '.')
    ) || 0
  );
}

/** Média bruta (0–10), sem truncar — usada na ordenação do ranking. */
export function calcMediaRaw(pontosObtidos: unknown, pontosDistribuidos: unknown): number {
  const obtidos = converterNumero(pontosObtidos);
  const distribuidos = converterNumero(pontosDistribuidos);

  if (distribuidos <= 0) return 0;

  const mediaCalculada = (obtidos / distribuidos) * 10;
  return Number.isFinite(mediaCalculada) ? mediaCalculada : 0;
}

/** Trunca em duas casas decimais, sem arredondar. */
export function truncarMedia(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  return Math.floor(valor * 100) / 100;
}

export function calcMedia(pontosObtidos: unknown, pontosDistribuidos: unknown): number {
  return truncarMedia(calcMediaRaw(pontosObtidos, pontosDistribuidos));
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatMedia(value: unknown): string {
  const num = typeof value === 'number' ? value : converterNumero(value);
  const media = truncarMedia(num);

  return media.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function censorName(name: string, isSelf: boolean): string {
  if (isSelf) return name;
  const parts = name.split(' ');
  return parts.map((p) => (p.length <= 2 ? '**' : p[0] + '*'.repeat(Math.min(p.length - 1, 5)))).join(' ');
}

export function applyRankingPrivacy<T extends { discente_id: string; nome: string }>(
  ranking: T[],
  viewerDiscenteId: string | null | undefined
): T[] {
  if (!viewerDiscenteId) return ranking;
  return ranking.map((entry) => ({
    ...entry,
    nome: censorName(entry.nome, entry.discente_id === viewerDiscenteId),
  }));
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    CONTROLADOR_GERAL: 'Controlador Geral',
    CONTROLADOR_PELOTÃO: 'Controlador de Pelotão',
    DISCENTE: 'Discente',
  };
  return labels[role] || role;
}

export function getTipoLancamentoLabel(tipo: string): string {
  const labels: Record<string, string> = {
    CONTROLADOR_GERAL: 'Controlador Geral',
    CONTROLADOR_PELOTÃO: 'Controlador de Pelotão',
    DISCENTE: 'Discente',
  };
  return labels[tipo] || tipo;
}

export function getActionLabel(acao: string): string {
  const labels: Record<string, string> = {
    CADASTRO: 'Cadastro',
    EDICAO: 'Edição',
    LANCAMENTO: 'Lançamento',
    CORRECAO: 'Correção',
    EXCLUSAO: 'Exclusão',
    IMPORTACAO: 'Importação',
    AUTORIZACAO: 'Autorização',
    BLOQUEIO: 'Bloqueio',
    ALTERACAO_USUARIO: 'Alteração de Usuário',
    REDEFINICAO_SENHA: 'Redefinição de Senha',
    BACKUP: 'Backup',
    RESTAURACAO: 'Restauração',
    LOGIN: 'Login',
    LOGIN_FALHA: 'Tentativa de Login',
    LOGOUT: 'Logout',
  };
  return labels[acao] || acao;
}
