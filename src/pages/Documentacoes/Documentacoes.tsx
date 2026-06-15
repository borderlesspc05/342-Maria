import React, { useState, useEffect, useCallback, useMemo } from "react";
import { renderModalPortal } from "../../utils/renderModalPortal";
import { Layout } from "../../components/Layout";
import {
  HiPlus,
  HiSearch,
  HiFilter,
  HiDocumentText,
  HiExclamationCircle,
  HiCheckCircle,
  HiClock,
  HiPaperClip,
  HiPencil,
  HiTrash,
  HiX,
  HiCalendar,
  HiUser,
  HiBell,
} from "react-icons/hi";
import { documentacoesService } from "../../services/documentacoesService";
import { colaboradorService } from "../../services/colaboradorService";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../contexts/ToastContext";
import type { Colaborador } from "../../types/premioProdutividade";
import type {
  Documento,
  DocumentoFilters,
  DocumentoStats,
  TipoDocumento,
  StatusDocumento,
  DocumentoFormData,
  Treinamento,
  TreinamentoFormData,
} from "../../types/documentacoes";
import {
  maskCPF,
  unmaskCPF,
  maskRG,
  maskCTPS,
  maskCNH,
} from "../../utils/masks";
import { WhatsAppButton } from "../../components/ui/WhatsAppButton";
import { buildSupportMessage } from "../../utils/whatsapp";
import "./Documentacoes.css";

const tiposDocumento: TipoDocumento[] = [
  "ASO",
  "NR-11",
  "NR-18",
  "NR-33",
  "NR-35",
  "CNH",
  "CPF",
  "RG",
  "CTPS",
  "Reservista",
  "Certificado de Treinamento",
  "Outro",
];

const statusOptions: StatusDocumento[] = [
  "Válido",
  "Vencido",
  "Vencendo",
  "Pendente",
];

const Documentacoes: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [treinamentos, setTreinamentos] = useState<Treinamento[]>([]);
  const [colaboradoresList, setColaboradoresList] = useState<Colaborador[]>([]);
  const [stats, setStats] = useState<DocumentoStats>({
    total: 0,
    validos: 0,
    vencidos: 0,
    vencendoEm7Dias: 0,
    vencendoEm30Dias: 0,
    pendentes: 0,
  });
  const [filters, setFilters] = useState<DocumentoFilters>({});
  const [showModal, setShowModal] = useState(false);
  const [showTreinamentoModal, setShowTreinamentoModal] = useState(false);
  const [editingDocumento, setEditingDocumento] = useState<Documento | null>(
    null
  );
  const [editingTreinamento, setEditingTreinamento] =
    useState<Treinamento | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<"documentos" | "treinamentos">(
    "documentos"
  );

  const loadDocumentos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await documentacoesService.list(filters);
      setDocumentos(data);
    } catch (error) {
      console.error("Erro ao carregar documentos:", error);
      alert("Não foi possível carregar os documentos.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadTreinamentos = useCallback(async () => {
    try {
      const data = await documentacoesService.listTreinamentos();
      setTreinamentos(data);
    } catch (error) {
      console.error("Erro ao carregar treinamentos:", error);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const data = await documentacoesService.getStats();
      setStats(data);
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  }, []);

  useEffect(() => {
    loadDocumentos();
    loadStats();
  }, [loadDocumentos, loadStats]);

  useEffect(() => {
    colaboradorService.list().then(setColaboradoresList).catch(console.error);
  }, []);

  useEffect(() => {
    if (activeTab === "treinamentos") {
      loadTreinamentos();
    }
  }, [activeTab, loadTreinamentos]);

  const handleFilterChange = (key: keyof DocumentoFilters, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleOpenModal = (documento?: Documento) => {
    setEditingDocumento(documento || null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDocumento(null);
  };

  const handleOpenTreinamentoModal = (treinamento?: Treinamento) => {
    setEditingTreinamento(treinamento || null);
    setShowTreinamentoModal(true);
  };

  const handleCloseTreinamentoModal = () => {
    setShowTreinamentoModal(false);
    setEditingTreinamento(null);
  };

  const handleSaveDocumento = async (formData: DocumentoFormData) => {
    try {
      if (editingDocumento) {
        await documentacoesService.update(editingDocumento.id, formData);
      } else {
        await documentacoesService.create(formData, user?.uid || "");
      }
      handleCloseModal();
      loadDocumentos();
      loadStats();
    } catch (error) {
      console.error("Erro ao salvar documento:", error);
      alert("Não foi possível salvar o documento.");
    }
  };

  const handleDeleteDocumento = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este documento?")) return;
    try {
      await documentacoesService.delete(id);
      loadDocumentos();
      loadStats();
    } catch (error) {
      console.error("Erro ao excluir documento:", error);
      alert("Não foi possível excluir o documento.");
    }
  };

  const handleRenovarDocumento = async (id: string) => {
    if (
      !confirm(
        "Renovar este documento por mais 12 meses a partir de hoje?"
      )
    ) {
      return;
    }
    try {
      await documentacoesService.renovarDocumento(id);
      showToast("Documento renovado com sucesso!");
      loadDocumentos();
      loadStats();
    } catch (error) {
      console.error("Erro ao renovar documento:", error);
      showToast("Não foi possível renovar o documento.", "error");
    }
  };

  const handleSaveTreinamento = async (formData: TreinamentoFormData) => {
    try {
      if (editingTreinamento) {
        await documentacoesService.updateTreinamento(
          editingTreinamento.id,
          formData
        );
        showToast("Treinamento atualizado com sucesso!");
      } else {
        await documentacoesService.createTreinamento(formData);
        showToast("Treinamento salvo com sucesso!");
      }
      handleCloseTreinamentoModal();
      loadTreinamentos();
    } catch (error) {
      console.error("Erro ao salvar treinamento:", error);
      showToast("Não foi possível salvar o treinamento.", "error");
    }
  };

  const handleDeleteTreinamento = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este treinamento?")) return;
    try {
      await documentacoesService.deleteTreinamento(id);
      showToast("Treinamento excluído com sucesso!");
      loadTreinamentos();
    } catch (error) {
      console.error("Erro ao excluir treinamento:", error);
      showToast("Não foi possível excluir o treinamento.", "error");
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR").format(date);
  };

  const getStatusBadgeClass = (status: StatusDocumento) => {
    switch (status) {
      case "Válido":
        return "status-valid";
      case "Vencido":
        return "status-expired";
      case "Vencendo":
        return "status-expiring";
      case "Pendente":
        return "status-pending";
      default:
        return "";
    }
  };

  const getStatusIcon = (status: StatusDocumento) => {
    switch (status) {
      case "Válido":
        return <HiCheckCircle className="status-icon valid" />;
      case "Vencido":
        return <HiExclamationCircle className="status-icon expired" />;
      case "Vencendo":
        return <HiClock className="status-icon expiring" />;
      case "Pendente":
        return <HiClock className="status-icon pending" />;
      default:
        return null;
    }
  };

  const filteredDocumentos = useMemo(() => {
    return documentos;
  }, [documentos]);

  return (
    <Layout>
      <div className="documentacoes-container">
        <div className="documentacoes-header">
          <div>
            <h1 className="documentacoes-title">Documentações e Integrações</h1>
            <p className="documentacoes-subtitle">
              Gestão de documentos obrigatórios e controle de validades
            </p>
          </div>
          <div className="documentacoes-header-actions">
            {activeTab === "documentos" && (
              <button
                className="documentacoes-btn-primary"
                onClick={() => handleOpenModal()}
              >
                <HiPlus />
                Novo Documento
              </button>
            )}
            {activeTab === "treinamentos" && (
              <button
                className="documentacoes-btn-primary"
                onClick={() => handleOpenTreinamentoModal()}
              >
                <HiPlus />
                Novo Treinamento
              </button>
            )}
          </div>
        </div>

        <div className="documentacoes-tabs">
          <button
            className={`documentacoes-tab ${
              activeTab === "documentos" ? "active" : ""
            }`}
            onClick={() => setActiveTab("documentos")}
          >
            <HiDocumentText />
            Documentos
          </button>
          <button
            className={`documentacoes-tab ${
              activeTab === "treinamentos" ? "active" : ""
            }`}
            onClick={() => setActiveTab("treinamentos")}
          >
            <HiCalendar />
            Treinamentos
          </button>
        </div>

        {activeTab === "documentos" && (
          <>
            <div className="documentacoes-stats">
              <div className="documentacoes-stat-card">
                <div className="documentacoes-stat-icon total">
                  <HiDocumentText />
                </div>
                <div className="documentacoes-stat-content">
                  <h3>Total</h3>
                  <p className="documentacoes-stat-value">{stats.total}</p>
                </div>
              </div>
              <div className="documentacoes-stat-card">
                <div className="documentacoes-stat-icon valid">
                  <HiCheckCircle />
                </div>
                <div className="documentacoes-stat-content">
                  <h3>Válidos</h3>
                  <p className="documentacoes-stat-value">{stats.validos}</p>
                </div>
              </div>
              <div className="documentacoes-stat-card">
                <div className="documentacoes-stat-icon expired">
                  <HiExclamationCircle />
                </div>
                <div className="documentacoes-stat-content">
                  <h3>Vencidos</h3>
                  <p className="documentacoes-stat-value">{stats.vencidos}</p>
                </div>
              </div>
              <div className="documentacoes-stat-card">
                <div className="documentacoes-stat-icon expiring">
                  <HiClock />
                </div>
                <div className="documentacoes-stat-content">
                  <h3>Vencendo (7 dias)</h3>
                  <p className="documentacoes-stat-value">
                    {stats.vencendoEm7Dias}
                  </p>
                </div>
              </div>
              <div className="documentacoes-stat-card">
                <div className="documentacoes-stat-icon warning">
                  <HiBell />
                </div>
                <div className="documentacoes-stat-content">
                  <h3>Vencendo (30 dias)</h3>
                  <p className="documentacoes-stat-value">
                    {stats.vencendoEm30Dias}
                  </p>
                </div>
              </div>
            </div>

            <div className="documentacoes-filters">
              <div className="documentacoes-search">
                <HiSearch className="documentacoes-search-icon" />
                <input
                  type="text"
                  placeholder="Buscar por colaborador..."
                  value={filters.colaboradorNome || ""}
                  onChange={(e) =>
                    handleFilterChange("colaboradorNome", e.target.value)
                  }
                />
              </div>
              <button
                className="documentacoes-filter-toggle"
                onClick={() => setShowFilters(!showFilters)}
              >
                <HiFilter />
                Filtros
              </button>
            </div>

            {showFilters && (
              <div className="documentacoes-filters-panel">
                <div className="documentacoes-filter-group">
                  <label>Tipo de Documento</label>
                  <select
                    value={filters.tipoDocumento || ""}
                    onChange={(e) =>
                      handleFilterChange(
                        "tipoDocumento",
                        e.target.value || undefined
                      )
                    }
                  >
                    <option value="">Todos</option>
                    {tiposDocumento.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="documentacoes-filter-group">
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
                <div className="documentacoes-filter-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={filters.vencidos || false}
                      onChange={(e) =>
                        handleFilterChange("vencidos", e.target.checked)
                      }
                    />
                    Apenas Vencidos
                  </label>
                </div>
                <div className="documentacoes-filter-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={filters.vencendoEm7Dias || false}
                      onChange={(e) =>
                        handleFilterChange("vencendoEm7Dias", e.target.checked)
                      }
                    />
                    Vencendo em 7 dias
                  </label>
                </div>
                <div className="documentacoes-filter-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={filters.vencendoEm30Dias || false}
                      onChange={(e) =>
                        handleFilterChange("vencendoEm30Dias", e.target.checked)
                      }
                    />
                    Vencendo em 30 dias
                  </label>
                </div>
              </div>
            )}

            <div className="documentacoes-table-container">
              <table className="documentacoes-table">
                <thead>
                  <tr>
                    <th>Colaborador</th>
                    <th>Tipo</th>
                    <th>Número</th>
                    <th>Validade</th>
                    <th>Status</th>
                    <th>Anexos</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="documentacoes-loading">
                        Carregando...
                      </td>
                    </tr>
                  ) : filteredDocumentos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="documentacoes-empty">
                        Nenhum documento encontrado
                      </td>
                    </tr>
                  ) : (
                    filteredDocumentos.map((doc) => (
                      <tr key={doc.id}>
                        <td>
                          <div className="documentacoes-colaborador">
                            <HiUser className="documentacoes-user-icon" />
                            <div>
                              <p className="documentacoes-colaborador-name">
                                {doc.colaboradorNome}
                              </p>
                              <p className="documentacoes-colaborador-info">
                                {doc.cargo} - {doc.setor}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td>{doc.tipoDocumento}</td>
                        <td>{doc.numeroDocumento || "-"}</td>
                        <td>{formatDate(doc.dataValidade)}</td>
                        <td>
                          <span
                            className={`documentacoes-status-badge ${getStatusBadgeClass(
                              doc.status
                            )}`}
                          >
                            {getStatusIcon(doc.status)}
                            {doc.status}
                          </span>
                        </td>
                        <td>
                          {doc.anexos.length > 0 ? (
                            <span className="documentacoes-anexos-count">
                              <HiPaperClip />
                              {doc.anexos.length}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>
                          <div className="documentacoes-actions">
                            <button
                              className="documentacoes-action-btn edit"
                              onClick={() => handleOpenModal(doc)}
                              title="Editar"
                            >
                              <HiPencil />
                            </button>
                            {(doc.status === "Vencido" ||
                              doc.status === "Vencendo" ||
                              doc.status === "Pendente") && (
                              <button
                                className="documentacoes-action-btn success"
                                onClick={() => handleRenovarDocumento(doc.id)}
                                title={
                                  doc.status === "Pendente"
                                    ? "Marcar como válido"
                                    : "Renovar documento"
                                }
                              >
                                <HiCheckCircle />
                              </button>
                            )}
                            {(doc.status === "Vencido" ||
                              doc.status === "Vencendo") && (
                              <WhatsAppButton
                                variant="icon"
                                label="WhatsApp RH"
                                message={buildSupportMessage(
                                  `Documento ${doc.tipoDocumento} de ${doc.colaboradorNome} (${doc.status}). Validade: ${formatDate(doc.dataValidade)}.`
                                )}
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                            <button
                              className="documentacoes-action-btn delete"
                              onClick={() => handleDeleteDocumento(doc.id)}
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
          </>
        )}

        {activeTab === "treinamentos" && (
          <div className="documentacoes-treinamentos-grid">
            {treinamentos.length === 0 ? (
              <div className="documentacoes-empty-state">
                <HiCalendar className="documentacoes-empty-icon" />
                <p>Nenhum treinamento cadastrado</p>
              </div>
            ) : (
              treinamentos.map((treinamento) => (
                <div
                  key={treinamento.id}
                  className="documentacoes-treinamento-card"
                >
                  <div className="documentacoes-treinamento-header">
                    <h3>{treinamento.titulo}</h3>
                    <span
                      className={`documentacoes-treinamento-status ${treinamento.status.toLowerCase()}`}
                    >
                      {treinamento.status}
                    </span>
                  </div>
                  <p className="documentacoes-treinamento-desc">
                    {treinamento.descricao}
                  </p>
                  <div className="documentacoes-treinamento-info">
                    <div>
                      <strong>Tipo:</strong> {treinamento.tipoDocumento}
                    </div>
                    <div>
                      <strong>Início:</strong>{" "}
                      {formatDate(treinamento.dataInicio)}
                    </div>
                    <div>
                      <strong>Fim:</strong> {formatDate(treinamento.dataFim)}
                    </div>
                    <div>
                      <strong>Participantes:</strong>{" "}
                      {treinamento.colaboradores.length}
                    </div>
                  </div>
                  <div className="documentacoes-treinamento-actions">
                    <button
                      className="documentacoes-action-btn edit"
                      onClick={() => handleOpenTreinamentoModal(treinamento)}
                    >
                      <HiPencil />
                      Editar
                    </button>
                    <button
                      className="documentacoes-action-btn delete"
                      onClick={() => handleDeleteTreinamento(treinamento.id)}
                    >
                      <HiTrash />
                      Excluir
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {showModal && (
          <DocumentoModal
            documento={editingDocumento}
            colaboradoresList={colaboradoresList}
            onClose={handleCloseModal}
            onSave={handleSaveDocumento}
          />
        )}

        {showTreinamentoModal && (
          <TreinamentoModal
            treinamento={editingTreinamento}
            colaboradoresList={colaboradoresList}
            onClose={handleCloseTreinamentoModal}
            onSave={handleSaveTreinamento}
          />
        )}
      </div>
    </Layout>
  );
};

interface DocumentoModalProps {
  documento: Documento | null;
  colaboradoresList: Colaborador[];
  onClose: () => void;
  onSave: (data: DocumentoFormData) => void;
}

const DocumentoModal: React.FC<DocumentoModalProps> = ({
  documento,
  colaboradoresList,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<DocumentoFormData>({
    colaboradorId: documento?.colaboradorId || "",
    colaboradorNome: documento?.colaboradorNome || "",
    cpf: maskCPF(documento?.cpf || ""),
    cargo: documento?.cargo || "",
    setor: documento?.setor || "",
    tipoDocumento: documento?.tipoDocumento || "ASO",
    numeroDocumento: documento?.numeroDocumento || "",
    orgaoEmissor: documento?.orgaoEmissor || "",
    dataEmissao: documento?.dataEmissao,
    dataValidade: documento?.dataValidade || new Date(),
    observacoes: documento?.observacoes || "",
    anexos: [],
    anexosExistentes: documento?.anexos || [],
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    if (name === "numeroDocumento") {
      // Aplica máscara baseada no tipo de documento
      let maskedValue = value;
      switch (formData.tipoDocumento) {
        case "CPF":
          maskedValue = maskCPF(value);
          break;
        case "RG":
          maskedValue = maskRG(value);
          break;
        case "CTPS":
          maskedValue = maskCTPS(value);
          break;
        case "CNH":
          maskedValue = maskCNH(value);
          break;
        default:
          maskedValue = value;
      }
      setFormData((prev) => ({ ...prev, [name]: maskedValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleDateChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value ? new Date(value) : undefined,
    }));
  };

  const handleColaboradorChange = (colaboradorId: string) => {
    const colaborador = colaboradoresList.find((c) => c.id === colaboradorId);
    if (colaborador) {
      setFormData((prev) => ({
        ...prev,
        colaboradorId: colaborador.id,
        colaboradorNome: colaborador.nome,
        cpf: maskCPF(colaborador.cpf),
        cargo: colaborador.cargo,
        setor: colaborador.setor,
      }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData((prev) => ({
        ...prev,
        anexos: Array.from(e.target.files || []),
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Remove máscaras antes de salvar
    const dataToSave = {
      ...formData,
      cpf: unmaskCPF(formData.cpf),
      numeroDocumento: formData.numeroDocumento
        ? formData.numeroDocumento.replace(/\D/g, "")
        : "",
      anexosExistentes: formData.anexosExistentes,
    };

    onSave(dataToSave);
  };

  return renderModalPortal(
    <div className="documentacoes-modal-overlay" onClick={onClose}>
      <div
        className="documentacoes-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="documentacoes-modal-header">
          <h2>{documento ? "Editar Documento" : "Novo Documento"}</h2>
          <button className="documentacoes-modal-close" onClick={onClose}>
            <HiX />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="documentacoes-modal-form">
          <div className="documentacoes-form-group">
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

          <div className="documentacoes-form-row">
            <div className="documentacoes-form-group">
              <label>Tipo de Documento *</label>
              <select
                name="tipoDocumento"
                value={formData.tipoDocumento}
                onChange={handleChange}
                required
              >
                {tiposDocumento.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>

            <div className="documentacoes-form-group">
              <label>Número do Documento</label>
              <input
                type="text"
                name="numeroDocumento"
                value={formData.numeroDocumento}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="documentacoes-form-row">
            <div className="documentacoes-form-group">
              <label>Órgão Emissor</label>
              <input
                type="text"
                name="orgaoEmissor"
                value={formData.orgaoEmissor}
                onChange={handleChange}
              />
            </div>

            <div className="documentacoes-form-group">
              <label>Data de Emissão</label>
              <input
                type="date"
                value={
                  formData.dataEmissao
                    ? formData.dataEmissao.toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) =>
                  handleDateChange("dataEmissao", e.target.value)
                }
              />
            </div>
          </div>

          <div className="documentacoes-form-group">
            <label>Data de Validade *</label>
            <input
              type="date"
              value={formData.dataValidade.toISOString().split("T")[0]}
              onChange={(e) => handleDateChange("dataValidade", e.target.value)}
              required
            />
          </div>

          <div className="documentacoes-form-group">
            <label>Observações</label>
            <textarea
              name="observacoes"
              value={formData.observacoes}
              onChange={handleChange}
              rows={3}
            />
          </div>

          <div className="documentacoes-form-group">
            <label>Anexar Arquivos</label>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
            />
            {formData.anexosExistentes && formData.anexosExistentes.length > 0 && (
              <p className="documentacoes-files-count">
                {formData.anexosExistentes.length} anexo(s) já salvo(s)
              </p>
            )}
            {formData.anexos && formData.anexos.length > 0 && (
              <p className="documentacoes-files-count">
                {formData.anexos.length} arquivo(s) selecionado(s)
              </p>
            )}
          </div>

          <div className="documentacoes-modal-actions">
            <button
              type="button"
              className="documentacoes-btn-secondary"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button type="submit" className="documentacoes-btn-primary">
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface TreinamentoModalProps {
  treinamento: Treinamento | null;
  colaboradoresList: Colaborador[];
  onClose: () => void;
  onSave: (data: TreinamentoFormData) => Promise<void>;
}

const TreinamentoModal: React.FC<TreinamentoModalProps> = ({
  treinamento,
  colaboradoresList,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<TreinamentoFormData>({
    titulo: treinamento?.titulo || "",
    descricao: treinamento?.descricao || "",
    dataInicio: treinamento?.dataInicio || new Date(),
    dataFim: treinamento?.dataFim || new Date(),
    colaboradores: treinamento?.colaboradores || [],
    tipoDocumento: treinamento?.tipoDocumento || "ASO",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: new Date(value),
    }));
  };

  const handleColaboradoresChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const selected = Array.from(
      e.target.selectedOptions,
      (option) => option.value
    );
    setFormData((prev) => ({ ...prev, colaboradores: selected }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return renderModalPortal(
    <div className="documentacoes-modal-overlay" onClick={onClose}>
      <div
        className="documentacoes-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="documentacoes-modal-header">
          <h2>{treinamento ? "Editar Treinamento" : "Novo Treinamento"}</h2>
          <button className="documentacoes-modal-close" onClick={onClose}>
            <HiX />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="documentacoes-modal-form">
          <div className="documentacoes-form-group">
            <label>Título *</label>
            <input
              type="text"
              name="titulo"
              value={formData.titulo}
              onChange={handleChange}
              required
            />
          </div>

          <div className="documentacoes-form-group">
            <label>Descrição</label>
            <textarea
              name="descricao"
              value={formData.descricao}
              onChange={handleChange}
              rows={3}
            />
          </div>

          <div className="documentacoes-form-row">
            <div className="documentacoes-form-group">
              <label>Data de Início *</label>
              <input
                type="date"
                value={formData.dataInicio.toISOString().split("T")[0]}
                onChange={(e) => handleDateChange("dataInicio", e.target.value)}
                required
              />
            </div>

            <div className="documentacoes-form-group">
              <label>Data de Fim *</label>
              <input
                type="date"
                value={formData.dataFim.toISOString().split("T")[0]}
                onChange={(e) => handleDateChange("dataFim", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="documentacoes-form-group">
            <label>Tipo de Documento *</label>
            <select
              name="tipoDocumento"
              value={formData.tipoDocumento}
              onChange={handleChange}
              required
            >
              {tiposDocumento.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>

          <div className="documentacoes-form-group">
            <label>Colaboradores *</label>
            <select
              multiple
              value={formData.colaboradores}
              onChange={handleColaboradoresChange}
              required
              size={5}
            >
              {colaboradoresList.map((colab: Colaborador) => (
                <option key={colab.id} value={colab.id}>
                  {colab.nome}
                </option>
              ))}
            </select>
            <p className="documentacoes-form-hint">
              Mantenha Ctrl (Cmd no Mac) pressionado para selecionar múltiplos
            </p>
          </div>

          <div className="documentacoes-modal-actions">
            <button
              type="button"
              className="documentacoes-btn-secondary"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button type="submit" className="documentacoes-btn-primary">
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Documentacoes;
