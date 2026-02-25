import React, { useState, useEffect } from "react";
import { Layout } from "../../components/Layout";
import {
  HiPlus,
  HiSearch,
  HiFilter,
  HiDocumentText,
  HiCheckCircle,
  HiClock,
  HiExclamationCircle,
  HiX,
  HiPaperClip,
  HiTrash,
  HiPencil,
  HiDownload,
  HiCloudUpload,
} from "react-icons/hi";
import type {
  BoletimMedicao,
  BoletimFilters,
  BoletimStatus,
  TipoServico,
  Anexo,
} from "../../types/boletimMedicao";
import { boletimMedicaoService } from "../../services/boletimMedicaoService";
import { useToast } from "../../contexts/ToastContext";
import { exportToPDF, exportToExcel } from "../../utils/exportUtils";
import { downloadAnexo, formatFileSize, validateFileSize, validateFileType } from "../../services/anexoService";
import "./BoletinsMedicao.css";

const BoletinsMedicao: React.FC = () => {
  const { showToast } = useToast();
  const [boletins, setBoletins] = useState<BoletimMedicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBoletim, setEditingBoletim] = useState<BoletimMedicao | null>(
    null
  );
  const [filters, setFilters] = useState<BoletimFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState({
    totalEmitidoMes: 0,
    saldoPendente: 0,
    totalBoletins: 0,
    aguardandoAssinatura: 0,
  });

  const meses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const tiposServico: TipoServico[] = [
    "Instalação",
    "Manutenção",
    "Vistoria",
    "Outro",
  ];
  const statusOptions: BoletimStatus[] = [
    "Emitido",
    "Pendente",
    "Aguardando assinatura",
  ];

  useEffect(() => {
    loadBoletins();
    loadStats();
  }, [filters]);

  const loadBoletins = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await boletimMedicaoService.getAll(filters);
      setBoletins(data);
    } catch (error) {
      console.error("Erro ao carregar boletins:", error);
      if (!silent) showToast("Erro ao atualizar a lista.", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const currentDate = new Date();
      const statsData = await boletimMedicaoService.getStats(
        currentDate.getFullYear(),
        meses[currentDate.getMonth()]
      );
      setStats(statsData);
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  };

  const handleFilterChange = (key: keyof BoletimFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este boletim?")) {
      try {
        await boletimMedicaoService.delete(id);
        showToast("Boletim excluído com sucesso!");
        loadBoletins();
        loadStats();
      } catch (error) {
        console.error("Erro ao excluir boletim:", error);
        showToast("Erro ao excluir boletim", "error");
      }
    }
  };

  const getStatusIcon = (status: BoletimStatus) => {
    switch (status) {
      case "Emitido":
        return <HiCheckCircle className="status-icon status-emitido" />;
      case "Pendente":
        return <HiClock className="status-icon status-pendente" />;
      case "Aguardando assinatura":
        return <HiExclamationCircle className="status-icon status-aguardando" />;
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

  const handleExportPDF = () => {
    const data = boletins.map((b) => ({
      numero: b.numero,
      cliente: b.cliente,
      mesAno: `${b.mesReferencia}/${b.anoReferencia}`,
      tipoServico: b.tipoServico,
      valor: b.valor,
      status: b.status,
      dataEmissao: b.dataEmissao || new Date(),
    }));

    const headers = {
      numero: "Número",
      cliente: "Cliente",
      mesAno: "Mês/Ano",
      tipoServico: "Tipo",
      valor: "Valor (R$)",
      status: "Status",
      dataEmissao: "Data Emissão",
    };

    exportToPDF(data, "boletins-medicao", "Boletins de Medição", headers);
    showToast("Exportando para PDF...");
  };

  const handleExportExcel = () => {
    const data = boletins.map((b) => ({
      numero: b.numero,
      cliente: b.cliente,
      mesAno: `${b.mesReferencia}/${b.anoReferencia}`,
      tipoServico: b.tipoServico,
      valor: b.valor,
      status: b.status,
      dataEmissao: b.dataEmissao ? formatDate(b.dataEmissao) : "-",
      dataVencimento: b.dataVencimento ? formatDate(b.dataVencimento) : "-",
      observacoes: b.observacoes || "",
    }));

    const headers = {
      numero: "Número",
      cliente: "Cliente",
      mesAno: "Mês/Ano",
      tipoServico: "Tipo de Serviço",
      valor: "Valor (R$)",
      status: "Status",
      dataEmissao: "Data Emissão",
      dataVencimento: "Data Vencimento",
      observacoes: "Observações",
    };

    exportToExcel(data, "boletins-medicao", headers);
    showToast("Exportado para Excel!");
  };

  return (
    <Layout>
      <div className="boletins-medicao">
        <div className="page-header">
          <div>
            <h1 className="page-title">Boletins de Medição</h1>
            <p className="page-subtitle">
              Controle e gestão de boletins de medição
            </p>
          </div>
          <div className="page-actions">
            <button
              className="btn-secondary"
              onClick={handleExportPDF}
              title="Exportar para PDF"
            >
              <HiDownload />
              PDF
            </button>
            <button
              className="btn-secondary"
              onClick={handleExportExcel}
              title="Exportar para Excel"
            >
              <HiDownload />
              Excel
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                setEditingBoletim(null);
                setShowModal(true);
              }}
            >
              <HiPlus />
              Novo Boletim
            </button>
          </div>
        </div>

        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-icon stat-icon-green">
              <HiDocumentText />
            </div>
            <div className="stat-content">
              <h3 className="stat-label">Total Emitido no Mês</h3>
              <p className="stat-value stat-value-success">
                {formatCurrency(stats.totalEmitidoMes)}
              </p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon stat-icon-orange">
              <HiClock />
            </div>
            <div className="stat-content">
              <h3 className="stat-label">Saldo Pendente</h3>
              <p className="stat-value stat-value-warning">
                {formatCurrency(stats.saldoPendente)}
              </p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon stat-icon-blue">
              <HiDocumentText />
            </div>
            <div className="stat-content">
              <h3 className="stat-label">Total de Boletins</h3>
              <p className="stat-value">{stats.totalBoletins}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon stat-icon-purple">
              <HiExclamationCircle />
            </div>
            <div className="stat-content">
              <h3 className="stat-label">Aguardando Assinatura</h3>
              <p className="stat-value stat-value-purple">
                {stats.aguardandoAssinatura}
              </p>
            </div>
          </div>
        </div>

        <div className="filters-section">
          <div className="filters-header">
            <button
              className="btn-filter"
              onClick={() => setShowFilters(!showFilters)}
            >
              <HiFilter />
              Filtros
            </button>
            <div className="search-box">
              <HiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Pesquisar por cliente..."
                value={filters.cliente || ""}
                onChange={(e) => handleFilterChange("cliente", e.target.value)}
              />
            </div>
          </div>

          {showFilters && (
            <div className="filters-panel">
              <div className="filter-group">
                <label>Mês</label>
                <select
                  value={filters.mes || ""}
                  onChange={(e) => handleFilterChange("mes", e.target.value)}
                >
                  <option value="">Todos os meses</option>
                  {meses.map((mes) => (
                    <option key={mes} value={mes}>
                      {mes}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Ano</label>
                <select
                  value={filters.ano || ""}
                  onChange={(e) =>
                    handleFilterChange("ano", e.target.value ? Number(e.target.value) : undefined)
                  }
                >
                  <option value="">Todos os anos</option>
                  {anos.map((ano) => (
                    <option key={ano} value={ano}>
                      {ano}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Tipo de Serviço</label>
                <select
                  value={filters.tipoServico || ""}
                  onChange={(e) =>
                    handleFilterChange("tipoServico", e.target.value as TipoServico)
                  }
                >
                  <option value="">Todos os tipos</option>
                  {tiposServico.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Status</label>
                <select
                  value={filters.status || ""}
                  onChange={(e) =>
                    handleFilterChange("status", e.target.value as BoletimStatus)
                  }
                >
                  <option value="">Todos os status</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <button className="btn-clear-filters" onClick={clearFilters}>
                Limpar Filtros
              </button>
            </div>
          )}
        </div>

        <div className="table-container">
          {loading ? (
            <div className="loading">Carregando...</div>
          ) : boletins.length === 0 ? (
            <div className="empty-state">
              <HiDocumentText className="empty-icon" />
              <p>Nenhum boletim encontrado</p>
            </div>
          ) : (
            <table className="boletins-table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Cliente</th>
                  <th>Mês/Ano</th>
                  <th>Tipo de Serviço</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Data Emissão</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {boletins.map((boletim) => (
                  <tr key={boletim.id}>
                    <td className="font-mono">{boletim.numero}</td>
                    <td>{boletim.cliente}</td>
                    <td>
                      {boletim.mesReferencia}/{boletim.anoReferencia}
                    </td>
                    <td>{boletim.tipoServico}</td>
                    <td className="font-semibold">
                      {formatCurrency(boletim.valor)}
                    </td>
                    <td>
                      <div className="status-badge">
                        {getStatusIcon(boletim.status)}
                        <span>{boletim.status}</span>
                      </div>
                    </td>
                    <td>
                      {boletim.dataEmissao
                        ? formatDate(boletim.dataEmissao)
                        : "-"}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-icon"
                          onClick={() => {
                            setEditingBoletim(boletim);
                            setShowModal(true);
                          }}
                          title="Editar"
                        >
                          <HiPencil />
                        </button>
                        <button
                          className="btn-icon btn-icon-danger"
                          onClick={() => handleDelete(boletim.id)}
                          title="Excluir"
                        >
                          <HiTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {showModal && (
          <BoletimModal
            boletim={editingBoletim}
            onClose={() => {
              setShowModal(false);
              setEditingBoletim(null);
            }}
            onSave={() => {
              setShowModal(false);
              setEditingBoletim(null);
              loadBoletins(true);
              loadStats();
            }}
          />
        )}
      </div>
    </Layout>
  );
};

interface BoletimModalProps {
  boletim: BoletimMedicao | null;
  onClose: () => void;
  onSave: () => void;
}

const BoletimModal: React.FC<BoletimModalProps> = ({
  boletim,
  onClose,
  onSave,
}) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    cliente: boletim?.cliente || "",
    mesReferencia: boletim?.mesReferencia || "",
    anoReferencia: boletim?.anoReferencia || new Date().getFullYear(),
    tipoServico: (boletim?.tipoServico || "Instalação") as TipoServico,
    status: (boletim?.status || "Pendente") as BoletimStatus,
    valor: boletim?.valor || 0,
    valorDisplay: (boletim?.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    dataEmissao: boletim?.dataEmissao
      ? new Date(boletim.dataEmissao).toISOString().split("T")[0]
      : "",
    dataVencimento: boletim?.dataVencimento
      ? new Date(boletim.dataVencimento).toISOString().split("T")[0]
      : "",
    observacoes: boletim?.observacoes || "",
    anexos: [] as File[],
  });

  const [loading, setLoading] = useState(false);
  const [existingAnexos, setExistingAnexos] = useState<Anexo[]>(boletim?.anexos || []);

  const meses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const tiposServico: TipoServico[] = [
    "Instalação",
    "Manutenção",
    "Vistoria",
    "Outro",
  ];
  const statusOptions: BoletimStatus[] = [
    "Emitido",
    "Pendente",
    "Aguardando assinatura",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        ...formData,
        dataEmissao: formData.dataEmissao
          ? new Date(formData.dataEmissao)
          : undefined,
        dataVencimento: formData.dataVencimento
          ? new Date(formData.dataVencimento)
          : undefined,
      };

      let boletimId: string;

      if (boletim) {
        await boletimMedicaoService.update(boletim.id, data);
        boletimId = boletim.id;
        showToast("Boletim atualizado com sucesso!");
      } else {
        const novoBol = await boletimMedicaoService.create(data);
        boletimId = novoBol.id;
        showToast("Boletim criado com sucesso!");
      }

      // Upload de novos anexos se houver
      if (formData.anexos.length > 0) {
        await boletimMedicaoService.addAnexos(boletimId, formData.anexos);
        showToast(`${formData.anexos.length} anexo(s) adicionado(s)!`);
      }

      onSave();
    } catch (error) {
      console.error("Erro ao salvar boletim:", error);
      showToast("Erro ao salvar boletim", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      
      // Validar tamanho e tipo
      const validFiles: File[] = [];
      for (const file of files) {
        if (!validateFileSize(file)) {
          showToast(`Arquivo ${file.name} excede 5MB`, "error");
          continue;
        }
        if (!validateFileType(file, ["application/pdf", "image/jpeg", "image/jpg", "image/png", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"])) {
          showToast(`Tipo de arquivo ${file.name} não permitido`, "error");
          continue;
        }
        validFiles.push(file);
      }
      
      setFormData((prev) => ({
        ...prev,
        anexos: [...prev.anexos, ...validFiles],
      }));
    }
  };

  const handleRemoveExistingAnexo = async (anexoId: string) => {
    if (!boletim) return;
    
    try {
      await boletimMedicaoService.removeAnexo(boletim.id, anexoId);
      setExistingAnexos((prev) => prev.filter((a) => a.id !== anexoId));
      showToast("Anexo removido!");
    } catch (error) {
      console.error("Erro ao remover anexo:", error);
      showToast("Erro ao remover anexo", "error");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{boletim ? "Editar Boletim" : "Novo Boletim de Medição"}</h2>
          <button className="btn-close" onClick={onClose}>
            <HiX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label>Cliente *</label>
              <input
                type="text"
                required
                value={formData.cliente}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, cliente: e.target.value }))
                }
                placeholder="Nome do cliente"
              />
            </div>

            <div className="form-group">
              <label>Mês de Referência *</label>
              <select
                required
                value={formData.mesReferencia}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    mesReferencia: e.target.value,
                  }))
                }
              >
                <option value="">Selecione...</option>
                {meses.map((mes) => (
                  <option key={mes} value={mes}>
                    {mes}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Ano de Referência *</label>
              <select
                required
                value={formData.anoReferencia}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    anoReferencia: Number(e.target.value),
                  }))
                }
              >
                {anos.map((ano) => (
                  <option key={ano} value={ano}>
                    {ano}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Tipo de Serviço *</label>
              <select
                required
                value={formData.tipoServico}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    tipoServico: e.target.value as TipoServico,
                  }))
                }
              >
                {tiposServico.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Status *</label>
              <select
                required
                value={formData.status}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    status: e.target.value as BoletimStatus,
                  }))
                }
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Valor (R$) *</label>
              <input
                type="text"
                required
                value={formData.valorDisplay}
                onChange={(e) => {
                  const value = e.target.value;
                  const cleaned = value.replace(/\D/g, '');
                  if (!cleaned) {
                    setFormData((prev) => ({
                      ...prev,
                      valor: 0,
                      valorDisplay: '0,00',
                    }));
                    return;
                  }
                  const number = parseFloat(cleaned) / 100;
                  setFormData((prev) => ({
                    ...prev,
                    valor: number,
                    valorDisplay: number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                  }));
                }}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Data de Emissão</label>
              <input
                type="date"
                value={formData.dataEmissao}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    dataEmissao: e.target.value,
                  }))
                }
              />
            </div>

            <div className="form-group">
              <label>Data de Vencimento</label>
              <input
                type="date"
                value={formData.dataVencimento}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    dataVencimento: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="form-group">
            <label>Observações</label>
            <textarea
              value={formData.observacoes}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  observacoes: e.target.value,
                }))
              }
              rows={4}
              placeholder="Observações adicionais..."
            />
          </div>

          <div className="form-group">
            <label>
              <HiPaperClip /> Anexos
            </label>
            
            {/* Anexos existentes */}
            {existingAnexos.length > 0 && (
              <div className="anexos-existentes">
                <h4>Anexos Atuais</h4>
                <div className="file-list">
                  {existingAnexos.map((anexo) => (
                    <div key={anexo.id} className="file-item existing">
                      <HiDocumentText />
                      <div className="file-info">
                        <span className="file-name">{anexo.nome}</span>
                        <span className="file-size">{formatFileSize(anexo.tamanho)}</span>
                      </div>
                      <button
                        type="button"
                        className="btn-download"
                        onClick={() => downloadAnexo(anexo)}
                        title="Baixar"
                      >
                        <HiDownload />
                      </button>
                      <button
                        type="button"
                        className="btn-remove"
                        onClick={() => handleRemoveExistingAnexo(anexo.id)}
                        title="Remover"
                      >
                        <HiX />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload de novos anexos */}
            <div className="file-upload">
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                id="file-upload"
                className="file-input"
              />
              <label htmlFor="file-upload" className="file-upload-label">
                <HiCloudUpload />
                Adicionar novos arquivos (PDF, DOC, IMG - max 5MB)
              </label>
              {formData.anexos.length > 0 && (
                <div className="file-list">
                  {formData.anexos.map((file, index) => (
                    <div key={index} className="file-item new">
                      <HiDocumentText />
                      <div className="file-info">
                        <span className="file-name">{file.name}</span>
                        <span className="file-size">{formatFileSize(file.size)}</span>
                      </div>
                      <button
                        type="button"
                        className="btn-remove"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            anexos: prev.anexos.filter((_, i) => i !== index),
                          }));
                        }}
                      >
                        <HiX />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Salvando..." : boletim ? "Atualizar" : "Criar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BoletinsMedicao;
