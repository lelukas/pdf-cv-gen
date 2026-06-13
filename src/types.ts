export interface Experiencia {
  empresa: string
  periodo: string
  cargo: string
  realizacoes: string[]
}

export interface Formacao {
  nome: string
  instituicao: string
  tipo?: string
  anoInicio: number
  anoFim: number
}

export interface Idioma {
  idioma: string
  nivel?: string
}

export interface Contato {
  localizacao?: string
  links?: string[]
  telefone?: string
  email?: string
}

export interface CurriculoData {
  nome: string
  cargo?: string
  contato?: Contato
  resumo?: string
  categorias_skills?: Record<string, string[]>
  praticas?: string
  habilidades?: string[]
  experiencias: Experiencia[]
  formacao?: Formacao[]
  certificacoes?: string[]
  idiomas?: Idioma[]
}
