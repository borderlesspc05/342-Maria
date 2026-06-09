export type TipoDocumento =
  | "ASO"
  | "NR-11"
  | "NR-18"
  | "NR-33"
  | "NR-35"
  | "CNH"
  | "CPF"
  | "RG"
  | "CTPS"
  | "Reservista"
  | "Certificado de Treinamento"
  | "Outro";

export type StatusDocumento = "Válido" | "Vencido" | "Vencendo" | "Pendente";

export interface AnexoDocumento {
  id: string;
  nome: string;
  tipo: string;
  url: string;
  tamanho: number;
  dataUpload: Date;
  storagePath?: string;
}

export interface Documento {
  id: string;
  colaboradorId: string;
  colaboradorNome: string;
  cpf: string;
  cargo: string;
  setor: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento?: string;
  orgaoEmissor?: string;
  dataEmissao?: Date;
  dataValidade: Date;
  status: StatusDocumento;
  observacoes?: string;
  anexos: AnexoDocumento[];
  alertaEnviado: boolean;
  dataAlerta?: Date;
  criadoPor: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface DocumentoFormData {
  colaboradorId: string;
  colaboradorNome: string;
  cpf: string;
  cargo: string;
  setor: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento?: string;
  orgaoEmissor?: string;
  dataEmissao?: Date;
  dataValidade: Date;
  observacoes?: string;
  anexos?: File[];
  anexosExistentes?: AnexoDocumento[];
}

export interface DocumentoFilters {
  colaboradorNome?: string;
  tipoDocumento?: TipoDocumento;
  status?: StatusDocumento;
  dataVencimentoInicio?: Date;
  dataVencimentoFim?: Date;
  vencidos?: boolean;
  vencendoEm7Dias?: boolean;
  vencendoEm30Dias?: boolean;
}

export interface DocumentoStats {
  total: number;
  validos: number;
  vencidos: number;
  vencendoEm7Dias: number;
  vencendoEm30Dias: number;
  pendentes: number;
}

export interface Treinamento {
  id: string;
  titulo: string;
  descricao: string;
  dataInicio: Date;
  dataFim: Date;
  colaboradores: string[];
  tipoDocumento: TipoDocumento;
  status: "Agendado" | "Em andamento" | "Concluído" | "Cancelado";
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface TreinamentoFormData {
  titulo: string;
  descricao: string;
  dataInicio: Date;
  dataFim: Date;
  colaboradores: string[];
  tipoDocumento: TipoDocumento;
}

