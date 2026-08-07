export type UserRole = 'CONTROLADOR_GERAL' | 'CONTROLADOR_PELOTÃO' | 'DISCENTE';

export type TipoAvaliacao = 'NUMERICA' | 'APTO_INAPTO';

export type TipoLancamento = 'CONTROLADOR_GERAL' | 'CONTROLADOR_PELOTÃO' | 'DISCENTE';

export type AutorizacaoStatus = 'ATIVA' | 'BLOQUEADA';

export type SituacaoAptoInapto = 'APTO' | 'INAPTO';

export type CampoAvaliacaoKey = 'trabalho' | 'trabalho_1' | 'trabalho_2' | 'avc' | 'avf' | 'situacao';

export interface CampoAvaliacao {
  key: CampoAvaliacaoKey;
  label: string;
  tipo: 'number' | 'radio';
  max?: number;
  opcoes?: string[];
}

export interface LancamentoNota {
  trabalho?: number | null;
  trabalho_1?: number | null;
  trabalho_2?: number | null;
  avc?: number | null;
  avf?: number | null;
  situacao?: SituacaoAptoInapto | null;
}

export type AuditAction =
  | 'CADASTRO'
  | 'EDICAO'
  | 'LANCAMENTO'
  | 'CORRECAO'
  | 'EXCLUSAO'
  | 'IMPORTACAO'
  | 'AUTORIZACAO'
  | 'BLOQUEIO'
  | 'ALTERACAO_USUARIO'
  | 'REDEFINICAO_SENHA'
  | 'BACKUP'
  | 'RESTAURACAO'
  | 'LOGIN'
  | 'LOGIN_FALHA'
  | 'LOGOUT';

export interface User {
  id: string;
  login: string;
  nome: string;
  password_hash?: string;
  role: UserRole;
  pelotao_id: string | null;
  discente_id: string | null;
  ativo: number;
  created_at: string;
  updated_at: string;
}

export interface Pelotao {
  id: string;
  numero: number;
  nome: string;
  controlador_id: string | null;
  ultima_atualizacao: string | null;
  created_at: string;
}

export interface Discente {
  id: string;
  nome: string;
  matricula: string;
  pelotao_id: string;
  data_ingresso: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Disciplina {
  id: string;
  nome: string;
  descricao: string | null;
  carga_horaria: number;
  tipo_avaliacao: TipoAvaliacao;
  possui_avc: number;
  possui_avf: number;
  qtd_trabalhos: number;
  max_trabalho: number;
  max_trabalho_1: number;
  max_trabalho_2: number;
  max_avc: number;
  max_avf: number;
  pontos_distribuidos: number;
  participa_ranking: number;
  participa_media: number;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface Nota {
  id: string;
  discente_id: string;
  disciplina_id: string;
  trabalho: number | null;
  trabalho_1: number | null;
  trabalho_2: number | null;
  avc: number | null;
  avf: number | null;
  situacao: SituacaoAptoInapto | null;
  nota_final: number | null;
  pontos_obtidos: number;
  lancado_por_id: string;
  tipo_lancamento: TipoLancamento;
  created_at: string;
  updated_at: string;
}

export interface AutorizacaoDiscente {
  id: string;
  pelotao_id: string;
  disciplina_id: string;
  status: AutorizacaoStatus;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  user_nome: string | null;
  user_role: UserRole | null;
  pelotao_id: string | null;
  discente_id: string | null;
  disciplina_id: string | null;
  tipo_avaliacao: string | null;
  valor_anterior: string | null;
  valor_novo: string | null;
  acao: AuditAction;
  motivo: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface RankingEntry {
  posicao: number;
  discente_id: string;
  nome: string;
  pelotao_id: string;
  pelotao_nome: string;
  pelotao_numero: number;
  pontos_distribuidos: number;
  pontos_obtidos: number;
  percentual: number;
  data_ingresso: string;
}

export interface SessionUser {
  id: string;
  login: string;
  nome: string;
  role: UserRole;
  pelotao_id: string | null;
  discente_id: string | null;
}

export interface DashboardStats {
  totalDiscentes: number;
  totalPelotoes: number;
  totalDisciplinas: number;
  totalNotas: number;
  lancamentosHoje: number;
}

export interface ImportPreviewItem {
  discente_matricula: string;
  discente_nome: string;
  disciplina_nome: string;
  resumo: string;
  nota_final: number | null;
  situacao: string | null;
  acao: 'INCLUIR' | 'ATUALIZAR' | 'REJEITAR';
  motivo?: string;
}
