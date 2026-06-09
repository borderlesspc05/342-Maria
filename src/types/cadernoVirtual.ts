export type LancamentoStatus = "Recebido" | "Pendente";

export type TipoMovimentacao =
  | "Serviço"
  | "Pagamento"
  | "Recebimento"
  | "Outro";

export interface AnexoLancamento {
  id: string;
  nome: string;
  tipo: string;
  url: string;
  tamanho: number;
  dataUpload: Date;
  /** Caminho no Firebase Storage; presente quando o anexo foi enviado via Storage (não base64). */
  storagePath?: string;
}

export interface LancamentoDiario {
  id: string;
  tipoMovimentacao: TipoMovimentacao;
  descricao: string;
  valor: number;
  dataLancamento: Date;
  status: LancamentoStatus;
  colaboradorId: string;
  colaboradorNome: string;
  observacoes?: string;
  anexos: AnexoLancamento[];
  criadoPor: string;
  criadoPorNome?: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface LancamentoFormData {
  tipoMovimentacao: TipoMovimentacao;
  descricao: string;
  valor: number;
  dataLancamento: Date;
  status: LancamentoStatus;
  colaboradorId: string;
  colaboradorNome: string;
  observacoes?: string;
  /** Novos arquivos selecionados pelo usuário para upload */
  anexos: File[];
  /** Anexos já salvos que devem ser mantidos (usado na edição) */
  anexosExistentes?: AnexoLancamento[];
}

export interface LancamentoFilters {
  dataInicio?: Date;
  dataFim?: Date;
  colaboradorId?: string;
  colaboradorNome?: string;
  tipoMovimentacao?: TipoMovimentacao;
  status?: LancamentoStatus;
}

export interface LancamentoStats {
  totalRecebido: number;
  totalPendente: number;
  totalLancamentos: number;
  totalPorTipo: Record<TipoMovimentacao, number>;
}
