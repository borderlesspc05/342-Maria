export type TipoNotificacao = 
  | "documento_vencendo" 
  | "documento_vencido" 
  | "premio_lancado" 
  | "boletim_pendente" 
  | "boletim_vencendo"
  | "sistema"
  | "outro";

export type PrioridadeNotificacao = "baixa" | "media" | "alta" | "urgente";

export interface Notificacao {
  id: string;
  userId: string;
  tipo: TipoNotificacao;
  prioridade: PrioridadeNotificacao;
  titulo: string;
  mensagem: string;
  lida: boolean;
  emailEnviado: boolean;
  dataEmailEnviado?: Date;
  link?: string; // Link para navegar ao clicar na notificação
  metadata?: {
    documentoId?: string;
    boletimId?: string;
    premioId?: string;
    colaboradorNome?: string;
    dataVencimento?: Date;
    [key: string]: unknown;
  };
  criadoEm: Date;
  lidoEm?: Date;
}

export interface NotificacaoFormData {
  userId: string;
  tipo: TipoNotificacao;
  prioridade: PrioridadeNotificacao;
  titulo: string;
  mensagem: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificacaoFilters {
  tipo?: TipoNotificacao;
  prioridade?: PrioridadeNotificacao;
  lida?: boolean;
  dataInicio?: Date;
  dataFim?: Date;
}

export interface NotificacaoStats {
  total: number;
  naoLidas: number;
  porTipo: Record<TipoNotificacao, number>;
  porPrioridade: Record<PrioridadeNotificacao, number>;
}

export interface ConfiguracaoNotificacao {
  id: string;
  userId: string;
  /** E-mail do usuário (para envio de notificações; gravado ao salvar configurações). */
  userEmail?: string;
  emailNotificacoes: boolean;
  emailDocumentoVencendo: boolean;
  emailDocumentoVencido: boolean;
  emailPremioLancado: boolean;
  emailBoletimPendente: boolean;
  diasAntesVencimento: number; // Quantos dias antes para alertar
  horaVerificacao: string; // Hora do dia para verificação (ex: "09:00")
  atualizadoEm: Date;
}

export interface ConfiguracaoNotificacaoFormData {
  userEmail?: string;
  emailNotificacoes: boolean;
  emailDocumentoVencendo: boolean;
  emailDocumentoVencido: boolean;
  emailPremioLancado: boolean;
  emailBoletimPendente: boolean;
  diasAntesVencimento: number;
  horaVerificacao: string;
}

