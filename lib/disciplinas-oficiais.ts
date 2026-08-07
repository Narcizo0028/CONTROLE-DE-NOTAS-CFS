import type { TipoAvaliacao } from './types';

export interface DisciplinaOficialConfig {
  ordem: number;
  nome: string;
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
}

/** Disciplinas oficiais CFS 2026 — atributos explícitos, sem regras em runtime */
export const DISCIPLINAS_OFICIAIS: DisciplinaOficialConfig[] = [
  cfg(1, 'APMI – Atividades Policiais e Militares Interdisciplinares', 270, apto()),
  cfg(2, 'Análise Criminal', 30, ate30()),
  cfg(3, 'Armamento e Tiro Policial', 60, apto()),
  cfg(4, 'Comunicação Organizacional', 30, ate30()),
  cfg(5, 'Defesa Pessoal Policial', 40, defesaPessoal()),
  cfg(6, 'Direito Civil Aplicado à Atividade Policial', 30, ate30()),
  cfg(7, 'Direito Penal', 40, acima30()),
  cfg(8, 'Direito Penal Militar', 30, ate30()),
  cfg(9, 'Direito Processual Penal Comum e Militar', 30, ate30()),
  cfg(10, 'Direitos Humanos', 30, ate30()),
  cfg(11, 'Educação Física Militar', 80, acima30()),
  cfg(12, 'Gestão Logística', 20, ate30()),
  cfg(13, 'Gestão Orçamentária e Financeira', 20, ate30()),
  cfg(14, 'Gestão de Serviços Operacionais', 30, ate30()),
  cfg(15, 'Instrumentos de Menor Potencial Ofensivo', 12, ate30()),
  cfg(16, 'Inteligência de Segurança Pública', 30, ate30()),
  cfg(17, 'Legislação Aplicada à Atividade Policial', 30, ate30()),
  cfg(18, 'Legislação Institucional Aplicada à Gestão de Recursos Humanos', 50, acima30()),
  cfg(19, 'Liderança Policial Militar e Gestão de Pessoas', 30, ate30()),
  cfg(20, 'Ordem Unida', 40, acima30()),
  cfg(21, 'Policiamento Ostensivo de Trânsito', 40, acima30()),
  cfg(22, 'Polícia Comunitária', 30, ate30()),
  cfg(23, 'Processos Administrativos', 70, acima30()),
  cfg(24, 'Proteção e Defesa Civil', 30, ate30()),
  cfg(25, 'Prática Curricular Supervisionada', 660, acima30()),
  cfg(26, 'Redação de Documentos Institucionais da PMMG', 40, acima30()),
  cfg(27, 'Resolução de Conflitos e Técnicas de Mediação', 20, ate30()),
  cfg(28, 'Saúde Integral', 16, apto()),
  cfg(29, 'Tecnologias Aplicadas à Atividade Policial', 20, ate30()),
  cfg(30, 'Técnica Policial Militar', 70, acima30()),
];

function cfg(ordem: number, nome: string, carga_horaria: number, attrs: Omit<DisciplinaOficialConfig, 'ordem' | 'nome' | 'carga_horaria'>): DisciplinaOficialConfig {
  return { ordem, nome, carga_horaria, ...attrs };
}

function apto(): Omit<DisciplinaOficialConfig, 'ordem' | 'nome' | 'carga_horaria'> {
  return {
    tipo_avaliacao: 'APTO_INAPTO',
    possui_avc: 0, possui_avf: 0, qtd_trabalhos: 0,
    max_trabalho: 0, max_trabalho_1: 0, max_trabalho_2: 0, max_avc: 0, max_avf: 0,
    pontos_distribuidos: 0, participa_ranking: 0, participa_media: 0,
  };
}

function ate30(): Omit<DisciplinaOficialConfig, 'ordem' | 'nome' | 'carga_horaria'> {
  return {
    tipo_avaliacao: 'NUMERICA',
    possui_avc: 0, possui_avf: 1, qtd_trabalhos: 1,
    max_trabalho: 3, max_trabalho_1: 0, max_trabalho_2: 0, max_avc: 0, max_avf: 7,
    pontos_distribuidos: 10, participa_ranking: 1, participa_media: 1,
  };
}

function acima30(): Omit<DisciplinaOficialConfig, 'ordem' | 'nome' | 'carga_horaria'> {
  return {
    tipo_avaliacao: 'NUMERICA',
    possui_avc: 1, possui_avf: 1, qtd_trabalhos: 1,
    max_trabalho: 3, max_trabalho_1: 0, max_trabalho_2: 0, max_avc: 3, max_avf: 4,
    pontos_distribuidos: 10, participa_ranking: 1, participa_media: 1,
  };
}

function defesaPessoal(): Omit<DisciplinaOficialConfig, 'ordem' | 'nome' | 'carga_horaria'> {
  return {
    tipo_avaliacao: 'NUMERICA',
    possui_avc: 0, possui_avf: 1, qtd_trabalhos: 2,
    max_trabalho: 0, max_trabalho_1: 2, max_trabalho_2: 2, max_avc: 0, max_avf: 6,
    pontos_distribuidos: 10, participa_ranking: 1, participa_media: 1,
  };
}
