export interface RelatorioConsolidado {
  id: string;
  mes: number;
  ano: number;
  dataGeracao: Date;
  geradoPor: string;
  geradoPorNome: string;
  /** Preenchido quando o relatório foi filtrado por colaborador */
  colaboradorId?: string;
  colaboradorNome?: string;
  resumo: ResumoRelatorio;
  premios: ResumoPremios;
  boletins: ResumoBoletins;
  documentacoes: ResumoDocumentacoes;
  recebimentos: ResumoRecebimentos;
}

export interface ResumoRelatorio {
  totalPremiosPagos: number;
  totalBoletinsEmitidos: number;
  totalDocumentacoesVencidas: number;
  totalRecebimentos: number;
  totalGeral: number;
}

export interface ResumoPremios {
  quantidade: number;
  valorTotal: number;
  aprovados: number;
  pendentes: number;
  emRevisao: number;
}

export interface ResumoBoletins {
  quantidade: number;
  valorTotal: number;
  emitidos: number;
  pendentes: number;
  aguardandoAssinatura: number;
}

export interface ResumoDocumentacoes {
  total: number;
  vencidas: number;
  vencendoEm7Dias: number;
  vencendoEm30Dias: number;
  emDia: number;
}

export interface ResumoRecebimentos {
  quantidade: number;
  valorTotal: number;
  recebidos: number;
  pendentes: number;
}

export interface RelatorioFilters {
  dataInicio?: Date;
  dataFim?: Date;
  colaboradorId?: string;
  colaboradorNome?: string;
  tipoRelatorio?:
    | "premios"
    | "boletins"
    | "documentacoes"
    | "recebimentos"
    | "consolidado";
}

export interface RelatorioFormData {
  mes: number;
  ano: number;
  colaboradorId?: string;
  tipoRelatorio:
    | "premios"
    | "boletins"
    | "documentacoes"
    | "recebimentos"
    | "consolidado";
}
