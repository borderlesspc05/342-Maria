export type BoletimStatus = "Emitido" | "Pendente" | "Aguardando assinatura";

export type TipoServico = "Instalação" | "Manutenção" | "Vistoria" | "Outro";

export interface Anexo {
  id: string;
  nome: string;
  tipo: string;
  url: string;
  tamanho: number;
  dataUpload: Date;
  /** Caminho no Firebase Storage; presente quando o anexo foi enviado via Storage (não base64). */
  storagePath?: string;
}

export interface BoletimMedicao {
  id: string;
  numero: string;
  cliente: string;
  mesReferencia: string;
  anoReferencia: number;
  tipoServico: TipoServico;
  status: BoletimStatus;
  valor: number;
  dataEmissao?: Date;
  dataVencimento?: Date;
  observacoes?: string;
  anexos: Anexo[];
  criadoPor: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface BoletimMedicaoFormData {
  cliente: string;
  mesReferencia: string;
  anoReferencia: number;
  tipoServico: TipoServico;
  status: BoletimStatus;
  valor: number;
  dataEmissao?: Date;
  dataVencimento?: Date;
  observacoes?: string;
  anexos: File[];
}

export interface BoletimFilters {
  mes?: string;
  ano?: number;
  cliente?: string;
  tipoServico?: TipoServico;
  status?: BoletimStatus;
}

export interface BoletimStats {
  totalEmitidoMes: number;
  saldoPendente: number;
  totalBoletins: number;
  aguardandoAssinatura: number;
}

