import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Layout } from "../../components/Layout";
import {
  HiPlus,
  HiSearch,
  HiFilter,
  HiDocumentText,
  HiCheckCircle,
  HiClock,
  HiPaperClip,
  HiPencil,
  HiTrash,
  HiX,
  HiDownload,
  HiPhotograph,
  HiUpload,
} from "react-icons/hi";
import { cadernoVirtualService } from "../../services/cadernoVirtualService";
import { colaboradorService } from "../../services/colaboradorService";
import {
  formatFileSize,
  validateFileSize,
  validateFileType,
} from "../../services/anexoService";
import {
  downloadAnexo as downloadAnexoUtil,
  abrirAnexoNovaAba,
  isAnexoDisponivel,
} from "../../utils/cadernoVirtualAnexoUtils";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../contexts/ToastContext";
import type { Colaborador } from "../../types/premioProdutividade";
import type {
  AnexoLancamento,
  LancamentoDiario,
  LancamentoFilters,
  LancamentoStatus,
  TipoMovimentacao,
  LancamentoFormData,
} from "../../types/cadernoVirtual";
import "./CadernoVirtual.css";

const tiposMovimentacao: TipoMovimentacao[] = [
  "Serviço",
  "Pagamento",
  "Recebimento",
  "Outro",
];

const statusOptions: LancamentoStatus[] = ["Recebido", "Pendente"];

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_FILE_SIZE_MB = 2;

function getFileIcon(tipo: string) {
  if (tipo.startsWith("image/")) return HiPhotograph;
  return HiDocumentText;
}

/** Popover de anexos na tabela: lista todos e permite abrir/baixar cada um. */
interface AnexosPopoverProps {
  anexos: AnexoLancamento[];
  onDownload: (anexo: AnexoLancamento) => Promise<void>;
  onOpen: (anexo: AnexoLancamento) => void;
  downloadingId: string | null;
}

const AnexosPopover: React.FC<AnexosPopoverProps> = ({
  anexos,
  onDownload,
  onOpen,
  downloadingId,
}) => {
  const [open, setOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      setDropdownRect(buttonRef.current.getBoundingClientRect());
    }
  }, []);

  const toggleOpen = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      if (next && buttonRef.current) {
        setDropdownRect(buttonRef.current.getBoundingClientRect());
      } else if (!next) {
        setDropdownRect(null);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const insidePopover = popoverRef.current?.contains(target);
      const insideDropdown = target.closest(".lancamentos-anexos-dropdown");
      if (!insidePopover && !insideDropdown) setOpen(false);
    };
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, updatePosition]);

  if (anexos.length === 0) {
    return <span className="lancamentos-sem-anexo">—</span>;
  }

  const dropdownContent = open && dropdownRect && (
    <div
      className="lancamentos-anexos-dropdown lancamentos-anexos-dropdown-portal"
      role="listbox"
      aria-label="Lista de anexos"
      style={{
        position: "fixed",
        top: dropdownRect.bottom + 6,
        left: dropdownRect.left,
        zIndex: 9999,
      }}
    >
      {anexos.map((anexo) => {
        const disponivel = isAnexoDisponivel(anexo);
        const Icon = getFileIcon(anexo.tipo);
        const isDownloading = downloadingId === anexo.id;
        return (
          <div
            key={anexo.id}
            className="lancamentos-anexos-dropdown-item"
            role="option"
          >
            <Icon className="lancamentos-anexos-dropdown-icon" aria-hidden />
            <div className="lancamentos-anexos-dropdown-info">
              <span className="lancamentos-anexos-dropdown-name" title={anexo.nome}>
                {anexo.nome}
              </span>
              <span className="lancamentos-anexos-dropdown-size">
                {formatFileSize(anexo.tamanho)}
              </span>
            </div>
            <div className="lancamentos-anexos-dropdown-actions">
              {disponivel ? (
                <>
                  <button
                    type="button"
                    className="lancamentos-anexos-dropdown-btn"
                    title="Abrir em nova aba"
                    onClick={() => {
                      onOpen(anexo);
                      setOpen(false);
                    }}
                    aria-label={`Abrir ${anexo.nome}`}
                  >
                    <HiDocumentText />
                  </button>
                  <button
                    type="button"
                    className="lancamentos-anexos-dropdown-btn lancamentos-anexos-dropdown-btn-download"
                    title="Baixar arquivo"
                    onClick={async () => {
                      await onDownload(anexo);
                      setOpen(false);
                    }}
                    disabled={isDownloading}
                    aria-label={`Baixar ${anexo.nome}`}
                  >
                    {isDownloading ? (
                      <span className="lancamentos-anexos-dropdown-spinner" aria-hidden />
                    ) : (
                      <HiDownload />
                    )}
                  </button>
                </>
              ) : (
                <span className="lancamentos-anexos-indisponivel">Indisponível</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="lancamentos-anexos-popover" ref={popoverRef}>
      <button
        ref={buttonRef}
        type="button"
        className="lancamentos-anexos-count"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`${anexos.length} anexo(s). Clique para ver lista.`}
        title="Ver anexos"
      >
        <HiPaperClip />
        <span>{anexos.length}</span>
      </button>
      {typeof document !== "undefined" && dropdownContent
        ? createPortal(dropdownContent, document.body)
        : null}
    </div>
  );
};

const LancamentosDiarios: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const hoje = new Date();
  const [lancamentos, setLancamentos] = useState<LancamentoDiario[]>([]);
  const [colaboradoresList, setColaboradoresList] = useState<Colaborador[]>([]);
  const [filters, setFilters] = useState<LancamentoFilters>({
    dataInicio: new Date(hoje.getFullYear(), hoje.getMonth(), 1),
    dataFim: hoje,
  });
  const [showModal, setShowModal] = useState(false);
  const [editingLancamento, setEditingLancamento] =
    useState<LancamentoDiario | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [downloadingAnexoId, setDownloadingAnexoId] = useState<string | null>(null);

  const loadLancamentos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await cadernoVirtualService.list(filters);
      setLancamentos(data);
    } catch (error) {
      console.error("Erro ao carregar lançamentos:", error);
      showToast("Não foi possível carregar os lançamentos.", "error");
    } finally {
      setLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => {
    loadLancamentos();
  }, [loadLancamentos]);

  useEffect(() => {
    colaboradorService.list().then(setColaboradoresList).catch(console.error);
  }, []);

  const handleFilterChange = (
    key: keyof LancamentoFilters,
    value: string | number | Date | undefined | null
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "" || value === null ? undefined : value,
    }));
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja remover este lançamento?")) return;
    try {
      await cadernoVirtualService.delete(id);
      await loadLancamentos();
      showToast("Lançamento removido com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir lançamento:", error);
      showToast("Não foi possível remover o lançamento.", "error");
    }
  };

  const handleStatusChange = async (id: string, status: LancamentoStatus) => {
    try {
      await cadernoVirtualService.updateStatus(id, status);
      await loadLancamentos();
      showToast("Status atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      showToast("Falha ao atualizar status.", "error");
    }
  };

  const handleDownloadAnexo = useCallback(
    async (anexo: AnexoLancamento) => {
      setDownloadingAnexoId(anexo.id);
      try {
        await downloadAnexoUtil(anexo);
      } catch (error) {
        console.error("Erro ao baixar anexo:", error);
        showToast("Não foi possível baixar o arquivo.", "error");
      } finally {
        setDownloadingAnexoId(null);
      }
    },
    [showToast]
  );

  const getStatusClass = (status: LancamentoStatus) =>
    status === "Recebido" ? "recebido" : "pendente";

  const getTipoClass = (tipo: TipoMovimentacao) => {
    const classes: Record<TipoMovimentacao, string> = {
      Serviço: "tipo-servico",
      Pagamento: "tipo-pagamento",
      Recebimento: "tipo-recebimento",
      Outro: "tipo-outro",
    };
    return classes[tipo];
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);

  const formatDateTime = (date: Date) =>
    new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);

  return (
    <Layout>
      <div className="lancamentos-container">
        <div className="lancamentos-header">
          <div>
            <h1 className="lancamentos-title">Caderno Virtual</h1>
            <p className="lancamentos-subtitle">
              Registro de lançamentos diários e movimentações
            </p>
          </div>
          <button
            className="lancamentos-primary-btn"
            onClick={() => {
              setEditingLancamento(null);
              setShowModal(true);
            }}
          >
            <HiPlus />
            Novo Lançamento
          </button>
        </div>

        <div className="lancamentos-filtros">
          <div className="lancamentos-filtros-header">
            <button
              className="lancamentos-filter-btn"
              onClick={() => setShowFilters(!showFilters)}
            >
              <HiFilter />
              Filtros
            </button>
            <div className="lancamentos-search">
              <HiSearch />
              <input
                type="text"
                placeholder="Buscar por colaborador..."
                value={filters.colaboradorNome || ""}
                onChange={(e) =>
                  handleFilterChange("colaboradorNome", e.target.value)
                }
              />
            </div>
          </div>

          {showFilters && (
            <div className="lancamentos-filtros-panel">
              <div className="lancamentos-filter-group">
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

              <div className="lancamentos-filter-group">
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

              <div className="lancamentos-filter-group">
                <label>Tipo de Movimentação</label>
                <select
                  value={filters.tipoMovimentacao || ""}
                  onChange={(e) =>
                    handleFilterChange(
                      "tipoMovimentacao",
                      e.target.value
                        ? (e.target.value as TipoMovimentacao)
                        : undefined
                    )
                  }
                >
                  <option value="">Todos</option>
                  {tiposMovimentacao.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lancamentos-filter-group">
                <label>Status</label>
                <select
                  value={filters.status || ""}
                  onChange={(e) =>
                    handleFilterChange(
                      "status",
                      e.target.value
                        ? (e.target.value as LancamentoStatus)
                        : undefined
                    )
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
            </div>
          )}
        </div>

        <div className="lancamentos-table-container">
          {loading ? (
            <div className="lancamentos-loading">Carregando lançamentos...</div>
          ) : lancamentos.length === 0 ? (
            <div className="lancamentos-empty">
              <HiDocumentText className="lancamentos-empty-icon" />
              <p>Nenhum lançamento encontrado.</p>
            </div>
          ) : (
            <div className="lancamentos-table-scroll">
            <table className="lancamentos-table">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th>Colaborador</th>
                  <th>Autor</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Anexos</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {lancamentos.map((lancamento) => (
                  <tr key={lancamento.id}>
                    <td>
                      <div className="lancamentos-datetime">
                        <strong>{formatDate(lancamento.dataLancamento)}</strong>
                        <span>{formatDateTime(lancamento.dataLancamento)}</span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`lancamentos-tipo-badge ${getTipoClass(
                          lancamento.tipoMovimentacao
                        )}`}
                      >
                        {lancamento.tipoMovimentacao}
                      </span>
                    </td>
                    <td>
                      <div className="lancamentos-descricao">
                        {lancamento.descricao}
                      </div>
                    </td>
                    <td>{lancamento.colaboradorNome}</td>
                    <td>{lancamento.criadoPorNome || "—"}</td>
                    <td className="lancamentos-valor">
                      {formatCurrency(lancamento.valor)}
                    </td>
                    <td>
                      <span
                        className={`lancamentos-status-badge ${getStatusClass(
                          lancamento.status
                        )}`}
                      >
                        {lancamento.status}
                      </span>
                    </td>
                    <td>
                      <AnexosPopover
                        anexos={lancamento.anexos}
                        onDownload={handleDownloadAnexo}
                        onOpen={abrirAnexoNovaAba}
                        downloadingId={downloadingAnexoId}
                      />
                    </td>
                    <td>
                      <div className="lancamentos-actions">
                        <button
                          className="lancamentos-action-btn"
                          title="Editar"
                          onClick={() => {
                            setEditingLancamento(lancamento);
                            setShowModal(true);
                          }}
                        >
                          <HiPencil />
                        </button>
                        <button
                          className="lancamentos-action-btn danger"
                          title="Excluir"
                          onClick={() => handleDelete(lancamento.id)}
                        >
                          <HiTrash />
                        </button>
                        {lancamento.status === "Pendente" && (
                          <button
                            className="lancamentos-action-btn success"
                            title="Marcar como recebido"
                            onClick={() =>
                              handleStatusChange(lancamento.id, "Recebido")
                            }
                          >
                            <HiCheckCircle />
                          </button>
                        )}
                        {lancamento.status === "Recebido" && (
                          <button
                            className="lancamentos-action-btn warning"
                            title="Marcar como pendente"
                            onClick={() =>
                              handleStatusChange(lancamento.id, "Pendente")
                            }
                          >
                            <HiClock />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        {showModal && (
          <LancamentoModal
            lancamento={editingLancamento}
            colaboradoresList={colaboradoresList}
            onClose={() => {
              setShowModal(false);
              setEditingLancamento(null);
            }}
            onSuccess={async () => {
              setShowModal(false);
              setEditingLancamento(null);
              await loadLancamentos();
            }}
            userId={user?.uid || ""}
            userName={user?.name || ""}
          />
        )}
      </div>
    </Layout>
  );
};

interface LancamentoModalProps {
  lancamento: LancamentoDiario | null;
  colaboradoresList: Colaborador[];
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  userName: string;
}

const LancamentoModal: React.FC<LancamentoModalProps> = ({
  lancamento,
  colaboradoresList,
  onClose,
  onSuccess,
  userId,
  userName,
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const defaultColab =
    colaboradoresList.length > 0 ? colaboradoresList[0] : null;

  const initialFormData = useMemo(
    () => ({
      tipoMovimentacao: (lancamento?.tipoMovimentacao ||
        "Serviço") as TipoMovimentacao,
      descricao: lancamento?.descricao || "",
      valor: lancamento?.valor ?? 0,
      valorDisplay: (lancamento?.valor ?? 0).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      dataLancamento: lancamento?.dataLancamento
        ? new Date(lancamento.dataLancamento).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      status: (lancamento?.status || "Pendente") as LancamentoStatus,
      colaboradorId:
        lancamento?.colaboradorId || defaultColab?.id || userId,
      colaboradorNome:
        lancamento?.colaboradorNome || defaultColab?.nome || userName,
      observacoes: lancamento?.observacoes || "",
    }),
    [lancamento, defaultColab, userId, userName]
  );

  const [formData, setFormData] = useState(initialFormData);
  const [saving, setSaving] = useState(false);

  /* Estado de anexos separado para melhor controle */
  const [existingAnexos, setExistingAnexos] = useState<AnexoLancamento[]>(
    lancamento?.anexos || []
  );
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    setFormData(initialFormData);
    setExistingAnexos(lancamento?.anexos || []);
    setNewFiles([]);
    setFileErrors([]);
  }, [lancamento, initialFormData]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    if (name === "valor") {
      const cleaned = value.replace(/\D/g, "");
      if (!cleaned) {
        setFormData((prev) => ({ ...prev, valor: 0, valorDisplay: "0,00" }));
        return;
      }
      const number = parseFloat(cleaned) / 100;
      setFormData((prev) => ({
        ...prev,
        valor: number,
        valorDisplay: number.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleColaboradorChange = (colaboradorId: string) => {
    const colaborador = colaboradoresList.find((c) => c.id === colaboradorId);
    if (colaborador) {
      setFormData((prev) => ({
        ...prev,
        colaboradorId: colaborador.id,
        colaboradorNome: colaborador.nome,
      }));
    }
  };

  const processFiles = (files: File[]) => {
    const errors: string[] = [];
    const valid: File[] = [];

    files.forEach((file) => {
      if (!validateFileSize(file, MAX_FILE_SIZE_MB)) {
        errors.push(`"${file.name}" excede ${MAX_FILE_SIZE_MB}MB`);
      } else if (!validateFileType(file, ALLOWED_FILE_TYPES)) {
        errors.push(`"${file.name}": tipo não permitido`);
      } else {
        valid.push(file);
      }
    });

    if (errors.length > 0) setFileErrors(errors);
    else setFileErrors([]);

    if (valid.length > 0) {
      setNewFiles((prev) => [...prev, ...valid]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingAnexo = (anexoId: string) => {
    setExistingAnexos((prev) => prev.filter((a) => a.id !== anexoId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload: LancamentoFormData = {
        tipoMovimentacao: formData.tipoMovimentacao,
        descricao: formData.descricao,
        valor: formData.valor,
        dataLancamento: new Date(formData.dataLancamento),
        status: formData.status,
        colaboradorId: formData.colaboradorId,
        colaboradorNome: formData.colaboradorNome,
        observacoes: formData.observacoes,
        anexos: newFiles,
        anexosExistentes: existingAnexos,
      };

      if (lancamento) {
        await cadernoVirtualService.update(lancamento.id, payload);
        showToast("Lançamento atualizado com sucesso!");
      } else {
        await cadernoVirtualService.create(payload, userId, userName);
        showToast("Lançamento salvo com sucesso!");
      }

      onSuccess();
    } catch (error) {
      console.error("Erro ao salvar lançamento:", error);
      showToast("Não foi possível salvar o lançamento.", "error");
    } finally {
      setSaving(false);
    }
  };

  const totalAnexos = existingAnexos.length + newFiles.length;

  return (
    <div className="lancamentos-modal-overlay" onClick={onClose}>
      <div
        className="lancamentos-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lancamentos-modal-header">
          <h2>{lancamento ? "Editar Lançamento" : "Novo Lançamento Diário"}</h2>
          <button className="lancamentos-modal-close" onClick={onClose}>
            <HiX />
          </button>
        </div>

        <form className="lancamentos-modal-form" onSubmit={handleSubmit}>
          <div className="lancamentos-modal-row">
            <div className="lancamentos-modal-group">
              <label>Tipo de Movimentação *</label>
              <select
                name="tipoMovimentacao"
                value={formData.tipoMovimentacao}
                onChange={handleChange}
                required
              >
                {tiposMovimentacao.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>

            <div className="lancamentos-modal-group">
              <label>Data *</label>
              <input
                type="date"
                name="dataLancamento"
                value={formData.dataLancamento}
                onChange={handleChange}
                required
              />
            </div>

            <div className="lancamentos-modal-group">
              <label>Status *</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="lancamentos-modal-row">
            <div className="lancamentos-modal-group">
              <label>Colaborador *</label>
              <select
                value={formData.colaboradorId}
                onChange={(e) => handleColaboradorChange(e.target.value)}
                required
              >
                <option value="">Selecione o colaborador...</option>
                {colaboradoresList.map((colab) => (
                  <option key={colab.id} value={colab.id}>
                    {colab.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="lancamentos-modal-group">
              <label>Valor (R$) *</label>
              <input
                type="text"
                name="valor"
                value={formData.valorDisplay}
                onChange={handleChange}
                required
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="lancamentos-modal-group">
            <label>Descrição *</label>
            <textarea
              name="descricao"
              value={formData.descricao}
              onChange={handleChange}
              rows={3}
              required
              placeholder="Descreva a movimentação..."
            />
          </div>

          <div className="lancamentos-modal-group">
            <label>Observações</label>
            <textarea
              name="observacoes"
              value={formData.observacoes}
              onChange={handleChange}
              rows={2}
              placeholder="Observações adicionais..."
            />
          </div>

          {/* ── Seção de Anexos ─────────────────────────────────── */}
          <div className="lancamentos-anexos-section">
            <div className="lancamentos-anexos-section-header">
              <HiPaperClip />
              <span>
                Comprovantes
                {totalAnexos > 0 && (
                  <span className="lancamentos-anexos-badge">{totalAnexos}</span>
                )}
              </span>
            </div>

            {/* Anexos já salvos */}
            {existingAnexos.length > 0 && (
              <div className="lancamentos-anexos-saved">
                <p className="lancamentos-anexos-saved-label">Salvos</p>
                <div className="lancamentos-file-list">
                  {existingAnexos.map((anexo) => {
                    const Icon = getFileIcon(anexo.tipo);
                    const disponivel = isAnexoDisponivel(anexo);
                    const isDownloading = downloadingId === anexo.id;
                    return (
                      <div key={anexo.id} className="lancamentos-file-item saved">
                        <Icon className="lancamentos-file-icon" aria-hidden />
                        <div className="lancamentos-file-info">
                          <span className="lancamentos-file-name" title={anexo.nome}>
                            {anexo.nome}
                          </span>
                          <span className="lancamentos-file-size">
                            {disponivel
                              ? formatFileSize(anexo.tamanho)
                              : "Indisponível"}
                          </span>
                        </div>
                        <div className="lancamentos-file-actions">
                          <button
                            type="button"
                            className="lancamentos-file-btn download"
                            title={disponivel ? "Baixar arquivo" : "Anexo indisponível"}
                            onClick={async () => {
                              if (!disponivel) return;
                              setDownloadingId(anexo.id);
                              try {
                                await downloadAnexoUtil(anexo);
                              } catch (err) {
                                console.error("Erro ao baixar anexo:", err);
                                showToast("Não foi possível baixar o arquivo.", "error");
                              } finally {
                                setDownloadingId(null);
                              }
                            }}
                            disabled={!disponivel || isDownloading}
                            aria-label={disponivel ? `Baixar ${anexo.nome}` : "Anexo indisponível"}
                          >
                            {isDownloading ? (
                              <span className="lancamentos-file-spinner" aria-hidden />
                            ) : (
                              <HiDownload />
                            )}
                          </button>
                          <button
                            type="button"
                            className="lancamentos-file-btn remove"
                            title="Remover anexo"
                            onClick={() => removeExistingAnexo(anexo.id)}
                            aria-label={`Remover ${anexo.nome}`}
                          >
                            <HiX />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Novos arquivos selecionados (ainda não salvos) */}
            {newFiles.length > 0 && (
              <div className="lancamentos-anexos-new">
                {existingAnexos.length > 0 && (
                  <p className="lancamentos-anexos-saved-label">Novos</p>
                )}
                <div className="lancamentos-file-list">
                  {newFiles.map((file, index) => {
                    const Icon = getFileIcon(file.type);
                    return (
                      <div key={index} className="lancamentos-file-item new">
                        <Icon className="lancamentos-file-icon" />
                        <div className="lancamentos-file-info">
                          <span className="lancamentos-file-name">
                            {file.name}
                          </span>
                          <span className="lancamentos-file-size">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="lancamentos-file-btn remove"
                          title="Remover"
                          onClick={() => removeNewFile(index)}
                        >
                          <HiX />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Erros de validação */}
            {fileErrors.length > 0 && (
              <div className="lancamentos-file-errors">
                {fileErrors.map((err, i) => (
                  <p key={i}>{err}</p>
                ))}
              </div>
            )}

            {/* Zona de upload (drag & drop) */}
            <div
              className={`lancamentos-dropzone ${isDragging ? "dragging" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Clique ou arraste arquivos para fazer upload"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  fileInputRef.current?.click();
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileInputChange}
                style={{ display: "none" }}
              />
              <HiUpload className="lancamentos-dropzone-icon" />
              <p className="lancamentos-dropzone-text">
                {isDragging
                  ? "Solte os arquivos aqui"
                  : "Clique ou arraste comprovantes aqui"}
              </p>
              <p className="lancamentos-dropzone-hint">
                PDF, JPG, PNG, DOC · máx. {MAX_FILE_SIZE_MB}MB por arquivo
              </p>
            </div>
          </div>

          <div className="lancamentos-modal-actions">
            <button
              type="button"
              className="lancamentos-secondary-btn"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="lancamentos-primary-btn"
              disabled={saving}
            >
              {saving
                ? newFiles.length > 0
                  ? "Processando anexos..."
                  : "Salvando..."
                : lancamento
                ? "Atualizar"
                : "Cadastrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LancamentosDiarios;
