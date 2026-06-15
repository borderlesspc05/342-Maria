export type PremioStatus = "Pendente" | "Em revisão" | "Aprovado";

export interface Colaborador {
  id: string;
  nome: string;
  cpf: string;
  cargo: string;
  setor: string;
  email?: string;
  telefone?: string;
  admissao?: Date;
}

export interface PremioProdutividade {
  id: string;
  colaboradorId: string;
  colaboradorNome: string;
  cpf: string;
  cargo: string;
  setor: string;
  valor: number;
  dataPremio: Date;
  motivo: string;
  status: PremioStatus;
  mesReferencia: number;
  anoReferencia: number;
  criadoEm: Date;
  atualizadoEm: Date;
  aprovadoPor?: string;
  observacoes?: string;
}

export interface PremioFormData {
  colaboradorId: string;
  colaboradorNome: string;
  cpf: string;
  cargo: string;
  setor: string;
  valor: number;
  dataPremio: Date;
  motivo: string;
  status: PremioStatus;
  observacoes?: string;
}

export interface PremioFilters {
  mes?: number;
  ano?: number;
  status?: PremioStatus;
  colaboradorNome?: string;
}

export interface PremioStats {
  totalPremiado: number;
  pendente: number;
  emRevisao: number;
  aprovados: number;
}

export interface PremioHistorico {
  colaboradorId: string;
  registros: PremioProdutividade[];
}

export interface RelatorioMensal {
  mes: number;
  ano: number;
  totalRegistros: number;
  totalPago: number;
  totalPendente: number;
  totalEmRevisao: number;
}

export const mockColaboradores: Colaborador[] = [
  {
    id: "colab-001",
    nome: "Maria Fernanda Alvarez",
    cpf: "123.456.789-00",
    cargo: "Analista de Produtividade",
    setor: "Operações",
    email: "maria.alvarez@empresa.com",
    admissao: new Date("2020-03-15"),
  },
];

