import React, { useState, useEffect, useCallback, useMemo } from "react";
import { renderModalPortal } from "../../utils/renderModalPortal";
import { Layout } from "../../components/Layout";
import {
  HiPlus,
  HiSearch,
  HiFilter,
  HiCurrencyDollar,
  HiCheckCircle,
  HiClock,
  HiXCircle,
  HiBan,
  HiPencil,
  HiTrash,
  HiX,
  HiUser,
  HiDownload,
  HiDocumentText,
  HiTrendingUp,
  HiTrendingDown,
} from "react-icons/hi";
import { financeiroService } from "../../services/financeiroService";
import { colaboradorService } from "../../services/colaboradorService";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../contexts/ToastContext";
import type { Colaborador } from "../../types/premioProdutividade";
import type {
  Transacao,
  TransacaoFilters,
  FinanceiroStats,
  TipoTransacao,
  StatusTransacao,
  CategoriaFinanceira,
  FormaPagamento,
  TransacaoFormData,
} from "../../types/financeiro";
import "./Financeiro.css";

const tiposTransacao: TipoTransacao[] = [
  "Adiantamento",
  "Pagamento",
  "Reembolso",
  "Desconto",
];

const statusOptions: StatusTransacao[] = [
  "Pendente",
  "Aprovado",
  "Pago",
  "Rejeitado",
  "Cancelado",
];

const categorias: CategoriaFinanceira[] = [
  "Salário",
  "Adiantamento Salarial",
  "Vale Transporte",
  "Vale Alimentação",
  "Prêmio",
  "Reembolso",
  "Despesa Operacional",
  "Outro",
];

const formasPagamento: FormaPagamento[] = [
  "Dinheiro",
  "PIX",
  "Transferência",
  "Cheque",
  "Cartão",
];

const Financeiro: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [colaboradoresList, setColaboradoresList] = useState<Colaborador[]>([]);
  const [stats, setStats] = useState<FinanceiroStats>({
    totalPendente: 0,
    totalAprovado: 0,
    totalPago: 0,
    totalRejeitado: 0,
    valorTotalPendente: 0,
    valorTotalAprovado: 0,
    valorTotalPago: 0,
    valorTotalMes: 0,
    adiantamentosPendentes: 0,
    pagamentosPendentes: 0,
  });
  const [filters, setFilters] = useState<TransacaoFilters>({});
  const [showModal, setShowModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [editingTransacao, setEditingTransacao] = useState<Transacao | null>(null);
  const [selectedTransacao, setSelectedTransacao] = useState<Transacao | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const loadTransacoes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await financeiroService.list(filters);
      setTransacoes(data);
    } catch (error) {
      console.error("Erro ao carregar transações:", error);
      alert("Não foi possível carregar as transações.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadStats = useCallback(async () => {
    try {
      const data = await financeiroService.getStats();
      setStats(data);
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  }, []);

  useEffect(() => {
    loadTransacoes();
    loadStats();
  }, [loadTransacoes, loadStats]);

  useEffect(() => {
    colaboradorService.list().then(setColaboradoresList).catch(console.error);
  }, []);

  const handleFilterChange = (key: keyof TransacaoFilters, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleOpenModal = (transacao?: Transacao) => {
    setEditingTransacao(transacao || null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTransacao(null);
  };

  const handleOpenStatusModal = (transacao: Transacao) => {
    setSelectedTransacao(transacao);
    setShowStatusModal(true);
  };

  const handleCloseStatusModal = () => {
    setShowStatusModal(false);
    setSelectedTransacao(null);
  };

  const handleSaveTransacao = async (formData: TransacaoFormData) => {
    try {
      if (editingTransacao) {
        await financeiroService.update(editingTransacao.id, formData);
        showToast("Transação atualizada com sucesso!");
      } else {
        await financeiroService.create(formData, user?.uid || "");
        showToast("Transação salva com sucesso!");
      }
      handleCloseModal();
      loadTransacoes();
      loadStats();
    } catch (error) {
      console.error("Erro ao salvar transação:", error);
      showToast("Não foi possível salvar a transação.", "error");
    }
  };

  const handleDeleteTransacao = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta transação?")) return;
    try {
      await financeiroService.delete(id);
      loadTransacoes();
      loadStats();
    } catch (error) {
      console.error("Erro ao excluir transação:", error);
      alert("Não foi possível excluir a transação.");
    }
  };

  const handleUpdateStatus = async (
    id: string,
    status: StatusTransacao,
    formaPagamento?: FormaPagamento,
    numeroComprovante?: string,
    observacoes?: string
  ) => {
    try {
      await financeiroService.updateStatus(
        id,
        status,
        user?.uid || "",
        formaPagamento,
        numeroComprovante,
        observacoes
      );
      handleCloseStatusModal();
      showToast("Status atualizado com sucesso!");
      loadTransacoes();
      loadStats();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      showToast("Não foi possível atualizar o status.", "error");
    }
  };

  const handleQuickStatusChange = async (
    transacao: Transacao,
    status: StatusTransacao
  ) => {
    if (status === "Pago") {
      handleOpenStatusModal(transacao);
      return;
    }
    try {
      await financeiroService.updateStatus(
        transacao.id,
        status,
        user?.uid || ""
      );
      showToast(
        status === "Aprovado"
          ? "Transação aprovada!"
          : "Status atualizado com sucesso!"
      );
      loadTransacoes();
      loadStats();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      showToast("Não foi possível atualizar o status.", "error");
    }
  };

  const handleExportarRelatorio = async () => {
    try {
      const url = await financeiroService.exportarRelatorioCSV(filters);
      const link = document.createElement("a");
      link.href = url;
      link.download = `relatorio_financeiro_${new Date().getTime()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao exportar relatório:", error);
      alert("Não foi possível exportar o relatório.");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR").format(date);
  };

  const getStatusBadgeClass = (status: StatusTransacao) => {
    switch (status) {
      case "Aprovado":
        return "status-approved";
      case "Pago":
        return "status-paid";
      case "Pendente":
        return "status-pending";
      case "Rejeitado":
        return "status-rejected";
      case "Cancelado":
        return "status-cancelled";
      default:
        return "";
    }
  };

  const getStatusIcon = (status: StatusTransacao) => {
    switch (status) {
      case "Aprovado":
        return <HiCheckCircle className="status-icon approved" />;
      case "Pago":
        return <HiCheckCircle className="status-icon paid" />;
      case "Pendente":
        return <HiClock className="status-icon pending" />;
      case "Rejeitado":
        return <HiXCircle className="status-icon rejected" />;
      case "Cancelado":
        return <HiBan className="status-icon cancelled" />;
      default:
        return null;
    }
  };

  const getTipoIcon = (tipo: TipoTransacao) => {
    switch (tipo) {
      case "Adiantamento":
        return <HiTrendingDown className="tipo-icon adiantamento" />;
      case "Pagamento":
        return <HiCurrencyDollar className="tipo-icon pagamento" />;
      case "Reembolso":
        return <HiTrendingUp className="tipo-icon reembolso" />;
      case "Desconto":
        return <HiTrendingDown className="tipo-icon desconto" />;
      default:
        return null;
    }
  };

  const filteredTransacoes = useMemo(() => {
    return transacoes;
  }, [transacoes]);

  return (
    <Layout>
      <div className="financeiro-container">
        <div className="financeiro-header">
          <div>
            <h1 className="financeiro-title">Gestão Financeira</h1>
            <p className="financeiro-subtitle">
              Controle de adiantamentos, pagamentos e reembolsos
            </p>
          </div>
          <div className="financeiro-header-actions">
            <button
              className="financeiro-btn-export"
              onClick={handleExportarRelatorio}
            >
              <HiDownload />
              Exportar Relatório
            </button>
            <button
              className="financeiro-btn-primary"
              onClick={() => handleOpenModal()}
            >
              <HiPlus />
              Nova Transação
            </button>
          </div>
        </div>

        <div className="financeiro-stats">
          <div className="financeiro-stat-card">
            <div className="financeiro-stat-icon pending">
              <HiClock />
            </div>
            <div className="financeiro-stat-content">
              <h3>Pendentes</h3>
              <p className="financeiro-stat-value">{stats.totalPendente}</p>
              <span className="financeiro-stat-label">
                {formatCurrency(stats.valorTotalPendente)}
              </span>
            </div>
          </div>
          <div className="financeiro-stat-card">
            <div className="financeiro-stat-icon approved">
              <HiCheckCircle />
            </div>
            <div className="financeiro-stat-content">
              <h3>Aprovados</h3>
              <p className="financeiro-stat-value">{stats.totalAprovado}</p>
              <span className="financeiro-stat-label">
                {formatCurrency(stats.valorTotalAprovado)}
              </span>
            </div>
          </div>
          <div className="financeiro-stat-card">
            <div className="financeiro-stat-icon paid">
              <HiCurrencyDollar />
            </div>
            <div className="financeiro-stat-content">
              <h3>Pagos</h3>
              <p className="financeiro-stat-value">{stats.totalPago}</p>
              <span className="financeiro-stat-label">
                {formatCurrency(stats.valorTotalPago)}
              </span>
            </div>
          </div>
          <div className="financeiro-stat-card">
            <div className="financeiro-stat-icon total">
              <HiDocumentText />
            </div>
            <div className="financeiro-stat-content">
              <h3>Total do Mês</h3>
              <p className="financeiro-stat-value">
                {formatCurrency(stats.valorTotalMes)}
              </p>
              <span className="financeiro-stat-label">
                {stats.adiantamentosPendentes} adiant. | {stats.pagamentosPendentes} pag.
              </span>
            </div>
          </div>
        </div>

        <div className="financeiro-filters">
          <div className="financeiro-search">
            <HiSearch className="financeiro-search-icon" />
            <input
              type="text"
              placeholder="Buscar por colaborador..."
              value={filters.colaboradorNome || ""}
              onChange={(e) => handleFilterChange("colaboradorNome", e.target.value)}
            />
          </div>
          <button
            className="financeiro-filter-toggle"
            onClick={() => setShowFilters(!showFilters)}
          >
            <HiFilter />
            Filtros
          </button>
        </div>

        {showFilters && (
          <div className="financeiro-filters-panel">
            <div className="financeiro-filter-group">
              <label>Tipo de Transação</label>
              <select
                value={filters.tipoTransacao || ""}
                onChange={(e) =>
                  handleFilterChange("tipoTransacao", e.target.value || undefined)
                }
              >
                <option value="">Todos</option>
                {tiposTransacao.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>
            <div className="financeiro-filter-group">
              <label>Status</label>
              <select
                value={filters.status || ""}
                onChange={(e) =>
                  handleFilterChange("status", e.target.value || undefined)
                }
              >
                <option value="">Todos</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="financeiro-filter-group">
              <label>Categoria</label>
              <select
                value={filters.categoria || ""}
                onChange={(e) =>
                  handleFilterChange("categoria", e.target.value || undefined)
                }
              >
                <option value="">Todas</option>
                {categorias.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="financeiro-filter-group">
              <label>Data Início</label>
              <input
                type="date"
                value={
                  filters.dataInicio
                    ? filters.dataInicio.toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) =>
                  handleFilterChange(
                    "dataInicio",
                    e.target.value ? new Date(e.target.value) : undefined
                  )
                }
              />
            </div>
            <div className="financeiro-filter-group">
              <label>Data Fim</label>
              <input
                type="date"
                value={
                  filters.dataFim
                    ? filters.dataFim.toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) =>
                  handleFilterChange(
                    "dataFim",
                    e.target.value ? new Date(e.target.value) : undefined
                  )
                }
              />
            </div>
          </div>
        )}

        <div className="financeiro-table-container">
          <table className="financeiro-table">
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th>Vencimento</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="financeiro-loading">
                    Carregando...
                  </td>
                </tr>
              ) : filteredTransacoes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="financeiro-empty">
                    Nenhuma transação encontrada
                  </td>
                </tr>
              ) : (
                filteredTransacoes.map((transacao) => (
                  <tr key={transacao.id}>
                    <td>
                      <div className="financeiro-colaborador">
                        <HiUser className="financeiro-user-icon" />
                        <div>
                          <p className="financeiro-colaborador-name">
                            {transacao.colaboradorNome}
                          </p>
                          <p className="financeiro-colaborador-info">
                            {transacao.cargo} - {transacao.setor}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="financeiro-tipo-badge">
                        {getTipoIcon(transacao.tipoTransacao)}
                        {transacao.tipoTransacao}
                      </span>
                    </td>
                    <td>{transacao.categoria}</td>
                    <td className="financeiro-valor">
                      {formatCurrency(transacao.valor)}
                    </td>
                    <td>{formatDate(transacao.dataVencimento)}</td>
                    <td>
                      <span
                        className={`financeiro-status-badge ${getStatusBadgeClass(
                          transacao.status
                        )}`}
                        onClick={() => handleOpenStatusModal(transacao)}
                        style={{ cursor: "pointer" }}
                      >
                        {getStatusIcon(transacao.status)}
                        {transacao.status}
                      </span>
                    </td>
                    <td>
                      <div className="financeiro-actions">
                        <button
                          className="financeiro-action-btn edit"
                          onClick={() => handleOpenModal(transacao)}
                          title="Editar"
                        >
                          <HiPencil />
                        </button>
                        {transacao.status === "Pendente" && (
                          <button
                            className="financeiro-action-btn success"
                            onClick={() =>
                              handleQuickStatusChange(transacao, "Aprovado")
                            }
                            title="Aprovar"
                          >
                            <HiCheckCircle />
                          </button>
                        )}
                        {transacao.status === "Aprovado" && (
                          <button
                            className="financeiro-action-btn success"
                            onClick={() =>
                              handleQuickStatusChange(transacao, "Pago")
                            }
                            title="Marcar como pago"
                          >
                            <HiCurrencyDollar />
                          </button>
                        )}
                        {transacao.status !== "Pago" &&
                          transacao.status !== "Cancelado" && (
                            <button
                              className="financeiro-action-btn status"
                              onClick={() => handleOpenStatusModal(transacao)}
                              title="Alterar status"
                            >
                              <HiClock />
                            </button>
                          )}
                        <button
                          className="financeiro-action-btn delete"
                          onClick={() => handleDeleteTransacao(transacao.id)}
                          title="Excluir"
                        >
                          <HiTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {showModal && (
          <TransacaoModal
            transacao={editingTransacao}
            colaboradoresList={colaboradoresList}
            onClose={handleCloseModal}
            onSave={handleSaveTransacao}
          />
        )}

        {showStatusModal && selectedTransacao && (
          <StatusModal
            transacao={selectedTransacao}
            onClose={handleCloseStatusModal}
            onUpdateStatus={handleUpdateStatus}
          />
        )}
      </div>
    </Layout>
  );
};

interface TransacaoModalProps {
  transacao: Transacao | null;
  colaboradoresList: Colaborador[];
  onClose: () => void;
  onSave: (data: TransacaoFormData) => void;
}

const TransacaoModal: React.FC<TransacaoModalProps> = ({
  transacao,
  colaboradoresList,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<TransacaoFormData>({
    colaboradorId: transacao?.colaboradorId || "",
    colaboradorNome: transacao?.colaboradorNome || "",
    cpf: transacao?.cpf || "",
    cargo: transacao?.cargo || "",
    setor: transacao?.setor || "",
    tipoTransacao: transacao?.tipoTransacao || "Adiantamento",
    categoria: transacao?.categoria || "Adiantamento Salarial",
    valor: transacao?.valor || 0,
    descricao: transacao?.descricao || "",
    dataVencimento: transacao?.dataVencimento || new Date(),
    formaPagamento: transacao?.formaPagamento,
    observacoes: transacao?.observacoes || "",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    if (name === "valor") {
      const num = parseFloat(value) || 0;
      setFormData((prev) => ({ ...prev, [name]: num }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      dataVencimento: new Date(value),
    }));
  };

  const handleColaboradorChange = (colaboradorId: string) => {
    const colaborador = colaboradoresList.find((c) => c.id === colaboradorId);
    if (colaborador) {
      setFormData((prev) => ({
        ...prev,
        colaboradorId: colaborador.id,
        colaboradorNome: colaborador.nome,
        cpf: colaborador.cpf,
        cargo: colaborador.cargo,
        setor: colaborador.setor,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return renderModalPortal(
    <div className="financeiro-modal-overlay" onClick={onClose}>
      <div
        className="financeiro-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="financeiro-modal-header">
          <h2>{transacao ? "Editar Transação" : "Nova Transação"}</h2>
          <button className="financeiro-modal-close" onClick={onClose}>
            <HiX />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="financeiro-modal-form">
          <div className="financeiro-form-group">
            <label>Colaborador *</label>
            <select
              value={formData.colaboradorId}
              onChange={(e) => handleColaboradorChange(e.target.value)}
              required
            >
              <option value="">Selecione...</option>
              {colaboradoresList.map((colab) => (
                <option key={colab.id} value={colab.id}>
                  {colab.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="financeiro-form-row">
            <div className="financeiro-form-group">
              <label>Tipo de Transação *</label>
              <select
                name="tipoTransacao"
                value={formData.tipoTransacao}
                onChange={handleChange}
                required
              >
                {tiposTransacao.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>

            <div className="financeiro-form-group">
              <label>Categoria *</label>
              <select
                name="categoria"
                value={formData.categoria}
                onChange={handleChange}
                required
              >
                {categorias.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="financeiro-form-row">
            <div className="financeiro-form-group">
              <label>Valor *</label>
              <input
                type="number"
                name="valor"
                value={formData.valor}
                onChange={handleChange}
                step="0.01"
                min="0"
                required
              />
            </div>

            <div className="financeiro-form-group">
              <label>Data de Vencimento *</label>
              <input
                type="date"
                value={formData.dataVencimento.toISOString().split("T")[0]}
                onChange={(e) => handleDateChange(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="financeiro-form-group">
            <label>Forma de Pagamento</label>
            <select
              name="formaPagamento"
              value={formData.formaPagamento || ""}
              onChange={handleChange}
            >
              <option value="">Selecione...</option>
              {formasPagamento.map((forma) => (
                <option key={forma} value={forma}>
                  {forma}
                </option>
              ))}
            </select>
          </div>

          <div className="financeiro-form-group">
            <label>Descrição *</label>
            <textarea
              name="descricao"
              value={formData.descricao}
              onChange={handleChange}
              rows={3}
              required
            />
          </div>

          <div className="financeiro-form-group">
            <label>Observações</label>
            <textarea
              name="observacoes"
              value={formData.observacoes}
              onChange={handleChange}
              rows={2}
            />
          </div>

          <div className="financeiro-modal-actions">
            <button
              type="button"
              className="financeiro-btn-secondary"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button type="submit" className="financeiro-btn-primary">
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface StatusModalProps {
  transacao: Transacao;
  onClose: () => void;
  onUpdateStatus: (
    id: string,
    status: StatusTransacao,
    formaPagamento?: FormaPagamento,
    numeroComprovante?: string,
    observacoes?: string
  ) => void;
}

const StatusModal: React.FC<StatusModalProps> = ({
  transacao,
  onClose,
  onUpdateStatus,
}) => {
  const [novoStatus, setNovoStatus] = useState<StatusTransacao>(
    transacao.status === "Aprovado" ? "Pago" : transacao.status
  );
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento | "">(
    transacao.formaPagamento || ""
  );
  const [numeroComprovante, setNumeroComprovante] = useState("");
  const [observacoes, setObservacoes] = useState(transacao.observacoes || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateStatus(
      transacao.id,
      novoStatus,
      formaPagamento || undefined,
      numeroComprovante || undefined,
      observacoes || undefined
    );
  };

  return renderModalPortal(
    <div className="financeiro-modal-overlay" onClick={onClose}>
      <div
        className="financeiro-modal-content financeiro-status-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="financeiro-modal-header">
          <h2>Atualizar Status</h2>
          <button className="financeiro-modal-close" onClick={onClose}>
            <HiX />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="financeiro-modal-form">
          <div className="financeiro-transacao-info">
            <p>
              <strong>Colaborador:</strong> {transacao.colaboradorNome}
            </p>
            <p>
              <strong>Tipo:</strong> {transacao.tipoTransacao}
            </p>
            <p>
              <strong>Valor:</strong>{" "}
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(transacao.valor)}
            </p>
          </div>

          <div className="financeiro-form-group">
            <label>Novo Status *</label>
            <select
              value={novoStatus}
              onChange={(e) => setNovoStatus(e.target.value as StatusTransacao)}
              required
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {novoStatus === "Pago" && (
            <>
              <div className="financeiro-form-group">
                <label>Forma de Pagamento *</label>
                <select
                  value={formaPagamento}
                  onChange={(e) =>
                    setFormaPagamento(e.target.value as FormaPagamento)
                  }
                  required
                >
                  <option value="">Selecione...</option>
                  {formasPagamento.map((forma) => (
                    <option key={forma} value={forma}>
                      {forma}
                    </option>
                  ))}
                </select>
              </div>

              <div className="financeiro-form-group">
                <label>Número do Comprovante</label>
                <input
                  type="text"
                  value={numeroComprovante}
                  onChange={(e) => setNumeroComprovante(e.target.value)}
                  placeholder="Ex: 123456789"
                />
              </div>
            </>
          )}

          <div className="financeiro-form-group">
            <label>Observações</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              placeholder="Adicione observações sobre esta atualização..."
            />
          </div>

          <div className="financeiro-modal-actions">
            <button
              type="button"
              className="financeiro-btn-secondary"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button type="submit" className="financeiro-btn-primary">
              Atualizar Status
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Financeiro;

