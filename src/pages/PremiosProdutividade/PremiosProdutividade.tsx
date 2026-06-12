import React, { useCallback, useEffect, useMemo, useState } from "react";
import { renderModalPortal } from "../../utils/renderModalPortal";
import { Layout } from "../../components/Layout";
import {
  HiPlus,
  HiSearch,
  HiFilter,
  HiDownload,
  HiClipboardCheck,
  HiCheckCircle,
  HiClock,
  HiExclamationCircle,
  HiPencil,
  HiTrash,
} from "react-icons/hi";
import { premioProdutividadeService } from "../../services/premioProdutividadeService";
import { colaboradorService } from "../../services/colaboradorService";
import type {
  PremioProdutividade,
  PremioFilters,
  PremioStatus,
  PremioFormData,
  PremioStats,
} from "../../types/premioProdutividade";
import type { Colaborador } from "../../types/premioProdutividade";
import { maskCPF, unmaskCPF } from "../../utils/masks";
import { useToast } from "../../contexts/ToastContext";
import "./PremiosProdutividade.css";

const generateTempId = () => {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  if (typeof globalThis !== "undefined" && "crypto" in globalThis) {
    const cryptoApi = (globalThis as typeof globalThis & { crypto?: Crypto })
      .crypto;
    if (cryptoApi?.randomUUID) {
      return cryptoApi.randomUUID();
    }
  }
  return `premio-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

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

const statusOptions: PremioStatus[] = ["Pendente", "Em revisão", "Aprovado"];

const PremiosProdutividade: React.FC = () => {
  const { showToast } = useToast();
  const hoje = new Date();
  const [premios, setPremios] = useState<PremioProdutividade[]>([]);
  const [colaboradoresList, setColaboradoresList] = useState<Colaborador[]>([]);
  const [historico, setHistorico] = useState<PremioProdutividade[]>([]);
  const [selectedColaborador, setSelectedColaborador] = useState<string>("");
  const [filters, setFilters] = useState<PremioFilters>({
    mes: hoje.getMonth() + 1,
    ano: hoje.getFullYear(),
  });
  const [stats, setStats] = useState<PremioStats>({
    totalPremiado: 0,
    pendente: 0,
    emRevisao: 0,
    aprovados: 0,
  });
  const [showModal, setShowModal] = useState(false);
  const [editingPremio, setEditingPremio] =
    useState<PremioProdutividade | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [lastReport, setLastReport] = useState<{
    mes: number;
    ano: number;
    totalRegistros: number;
    totalPago: number;
  } | null>(null);

  const loadPremios = useCallback(async () => {
    try {
      setLoading(true);
      const data = await premioProdutividadeService.list(filters);
      setPremios(data);
    } catch (error: any) {
      console.error("Erro ao carregar prêmios:", error);
      const errorMessage = error?.message || "Não foi possível carregar os prêmios de produtividade.";
      showToast(errorMessage, "error");
      setPremios([]); // Define lista vazia em caso de erro
    } finally {
      setLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => {
    loadPremios();
  }, [loadPremios]);

  useEffect(() => {
    colaboradorService.list().then(setColaboradoresList).catch((error) => {
      console.error("Erro ao carregar colaboradores:", error);
      showToast("Erro ao carregar lista de colaboradores", "error");
    });
  }, [showToast]);

  const loadStats = useCallback(async (ano: number, mes: number) => {
    try {
      const data = await premioProdutividadeService.getStats(ano, mes);
      setStats(data);
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  }, []);

  useEffect(() => {
    if (filters.ano && filters.mes) {
      loadStats(filters.ano, filters.mes);
    }
  }, [filters.ano, filters.mes, loadStats]);

  const loadHistorico = useCallback(async (colaboradorId: string) => {
    try {
      const data = await premioProdutividadeService.getHistoricoByColaborador(
        colaboradorId
      );
      setHistorico(data);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    }
  }, []);

  useEffect(() => {
    if (selectedColaborador) {
      loadHistorico(selectedColaborador);
    }
  }, [selectedColaborador, loadHistorico]);


  const handleFilterChange = (
    key: keyof PremioFilters,
    value: string | number | undefined | null
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "" || value === null ? undefined : value,
    }));
  };

  const handleApprove = async (
    premioId: string,
    status: PremioStatus
  ): Promise<void> => {
    try {
      await premioProdutividadeService.updateStatus(premioId, status, "admin");
      showToast("Status do prêmio atualizado com sucesso!");
      await loadPremios();
      if (selectedColaborador) {
        await loadHistorico(selectedColaborador);
      }
      if (filters.ano && filters.mes) {
        await loadStats(filters.ano, filters.mes);
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      showToast("Falha ao atualizar status do prêmio.", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja remover este prêmio?")) return;
    try {
      await premioProdutividadeService.delete(id);
      showToast("Prêmio removido com sucesso!");
      await loadPremios();
      if (selectedColaborador) {
        await loadHistorico(selectedColaborador);
      }
      if (filters.ano && filters.mes) {
        await loadStats(filters.ano, filters.mes);
      }
    } catch (error) {
      console.error("Erro ao excluir prêmio:", error);
      showToast("Não foi possível remover o prêmio.", "error");
    }
  };

  const handleGenerateReport = async () => {
    if (!filters.ano || !filters.mes) return;
    try {
      setReportLoading(true);
      const report = await premioProdutividadeService.gerarRelatorioMensal(
        filters.ano,
        filters.mes
      );
      setLastReport({
        ...report,
        totalPago: report.totalPago,
      });
      alert("Relatório mensal gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      alert("Não foi possível gerar o relatório.");
    } finally {
      setReportLoading(false);
    }
  };

  const handleExport = async () => {
    if (!filters.ano || !filters.mes) return;
    try {
      setExportLoading(true);
      const blob = await premioProdutividadeService.exportarRelatorioCSV(
        filters.ano,
        filters.mes
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `premios_produtividade_${filters.ano}_${String(
        filters.mes
      ).padStart(2, "0")}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      showToast("Planilha exportada com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar relatório:", error);
      showToast("Não foi possível exportar a planilha.", "error");
    } finally {
      setExportLoading(false);
    }
  };

  const colaboradoresOptions = useMemo(() => {
    const uniqueFromData = premios.reduce<Record<string, { nome: string }>>(
      (acc, premio) => {
        if (!acc[premio.colaboradorId]) {
          acc[premio.colaboradorId] = { nome: premio.colaboradorNome };
        }
        return acc;
      },
      {}
    );

    return [
      ...colaboradoresList.map((colab) => ({
        id: colab.id,
        nome: colab.nome,
      })),
      ...Object.entries(uniqueFromData).map(([id, data]) => ({
        id,
        nome: data.nome,
      })),
    ].filter(
      (value, index, self) =>
        index === self.findIndex((option) => option.id === value.id)
    );
  }, [premios, colaboradoresList]);

  const getStatusClass = (status: PremioStatus) => {
    switch (status) {
      case "Pendente":
        return "pendente";
      case "Em revisão":
        return "em-revisao";
      case "Aprovado":
        return "aprovado";
      default:
        return "";
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("pt-BR").format(date);

  return (
    <Layout>
      <div className="premios-container">
        <div className="premios-header">
          <div>
            <h1 className="premios-title">Prêmio de Produtividade</h1>
            <p className="premios-subtitle">
              Cadastre, aprove e acompanhe o histórico de prêmios por
              colaborador
            </p>
          </div>
          <div className="premios-header-actions">
            <button
              className="premios-secondary-btn"
              onClick={handleGenerateReport}
              disabled={reportLoading}
            >
              <HiClipboardCheck />
              {reportLoading ? "Gerando..." : "Relatório mensal"}
            </button>
            <button
              className="premios-secondary-btn"
              onClick={handleExport}
              disabled={exportLoading}
            >
              <HiDownload />
              {exportLoading ? "Exportando..." : "Exportar planilha"}
            </button>
            <button
              className="premios-primary-btn"
              onClick={() => {
                setEditingPremio(null);
                setShowModal(true);
              }}
            >
              <HiPlus />
              Novo prêmio
            </button>
          </div>
        </div>

        <div className="premios-stats">
          <div className="premios-stat-card">
            <div className="premios-stat-icon verde">
              <HiCheckCircle />
            </div>
            <div>
              <p>Total aprovado</p>
              <strong>{formatCurrency(stats.aprovados)}</strong>
            </div>
          </div>

          <div className="premios-stat-card">
            <div className="premios-stat-icon amarelo">
              <HiClock />
            </div>
            <div>
              <p>Pendentes</p>
              <strong>{formatCurrency(stats.pendente)}</strong>
            </div>
          </div>

          <div className="premios-stat-card">
            <div className="premios-stat-icon roxo">
              <HiExclamationCircle />
            </div>
            <div>
              <p>Em revisão</p>
              <strong>{formatCurrency(stats.emRevisao)}</strong>
            </div>
          </div>

          <div className="premios-stat-card">
            <div className="premios-stat-icon azul">
              <HiCheckCircle />
            </div>
            <div>
              <p>Total mês</p>
              <strong>{formatCurrency(stats.totalPremiado)}</strong>
            </div>
          </div>
        </div>

        <div className="premios-filtros">
          <div className="premios-filtros-header">
            <button className="premios-filter-btn">
              <HiFilter />
              Filtros
            </button>
            <div className="premios-search">
              <HiSearch />
              <input
                type="text"
                placeholder="Buscar colaborador..."
                value={filters.colaboradorNome || ""}
                onChange={(e) =>
                  handleFilterChange("colaboradorNome", e.target.value)
                }
              />
            </div>
          </div>

          <div className="premios-filtros-grid">
            <div className="premios-filter-group">
              <label>Mês</label>
              <select
                value={filters.mes || ""}
                onChange={(e) =>
                  handleFilterChange(
                    "mes",
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
              >
                {meses.map((mes, index) => (
                  <option key={mes} value={index + 1}>
                    {mes}
                  </option>
                ))}
              </select>
            </div>

            <div className="premios-filter-group">
              <label>Ano</label>
              <select
                value={filters.ano || ""}
                onChange={(e) =>
                  handleFilterChange(
                    "ano",
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
              >
                {Array.from(
                  { length: 5 },
                  (_, index) => hoje.getFullYear() - index
                ).map((ano) => (
                  <option key={ano} value={ano}>
                    {ano}
                  </option>
                ))}
              </select>
            </div>

            <div className="premios-filter-group">
              <label>Status</label>
              <select
                value={filters.status || ""}
                onChange={(e) =>
                  handleFilterChange(
                    "status",
                    e.target.value
                      ? (e.target.value as PremioStatus)
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
        </div>

        <div className="premios-content">
          <div className="premios-table-wrapper">
            {loading ? (
              <div className="premios-loading">Carregando prêmios...</div>
            ) : premios.length === 0 ? (
              <div className="premios-empty">
                <p>Nenhum prêmio encontrado.</p>
              </div>
            ) : (
              <table className="premios-table">
                <thead>
                  <tr>
                    <th>Colaborador</th>
                    <th>Setor</th>
                    <th>Valor</th>
                    <th>Data</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {premios.map((premio) => (
                    <tr key={premio.id}>
                      <td>
                        <div className="premios-colaborador">
                          <strong>{premio.colaboradorNome}</strong>
                          <span>{premio.cargo}</span>
                        </div>
                      </td>
                      <td>{premio.setor}</td>
                      <td>{formatCurrency(premio.valor)}</td>
                      <td>{formatDate(premio.dataPremio)}</td>
                      <td>
                        <span
                          className={`premios-status-badge ${getStatusClass(
                            premio.status
                          )}`}
                        >
                          {premio.status}
                        </span>
                      </td>
                      <td>
                        <div className="premios-actions">
                          <button
                            className="premios-action-btn"
                            title="Editar"
                            onClick={() => {
                              setEditingPremio(premio);
                              setShowModal(true);
                            }}
                          >
                            <HiPencil />
                          </button>
                          <button
                            className="premios-action-btn danger"
                            title="Excluir"
                            onClick={() => handleDelete(premio.id)}
                          >
                            <HiTrash />
                          </button>
                          {premio.status !== "Aprovado" && (
                            <button
                              className="premios-action-btn success"
                              title="Aprovar"
                              onClick={() =>
                                handleApprove(premio.id, "Aprovado")
                              }
                            >
                              <HiCheckCircle />
                            </button>
                          )}
                          {premio.status !== "Em revisão" && (
                            <button
                              className="premios-action-btn warning"
                              title="Enviar para revisão"
                              onClick={() =>
                                handleApprove(premio.id, "Em revisão")
                              }
                            >
                              <HiExclamationCircle />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="premios-historico">
            <h3>Histórico por colaborador</h3>
            <select
              value={selectedColaborador}
              onChange={(e) => setSelectedColaborador(e.target.value)}
            >
              {colaboradoresOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.nome}
                </option>
              ))}
            </select>

            <div className="premios-historico-list">
              {historico.length === 0 ? (
                <p>Nenhum registro para este colaborador.</p>
              ) : (
                historico.map((registro) => (
                  <div key={registro.id} className="premios-historico-item">
                    <div>
                      <strong>{formatCurrency(registro.valor)}</strong>
                      <span>{formatDate(registro.dataPremio)}</span>
                    </div>
                    <span
                      className={`premios-status-badge ${getStatusClass(
                        registro.status
                      )}`}
                    >
                      {registro.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            {lastReport && (
              <div className="premios-report-summary">
                <h4>Último relatório gerado</h4>
                <p>
                  {meses[lastReport.mes - 1]} / {lastReport.ano} •{" "}
                  {lastReport.totalRegistros} registros
                </p>
                <strong>
                  Total Pago: {formatCurrency(lastReport.totalPago)}
                </strong>
              </div>
            )}
          </div>
        </div>

        {showModal && (
          <PremioModal
            premio={editingPremio}
            colaboradoresList={colaboradoresList}
            onClose={() => {
              setShowModal(false);
              setEditingPremio(null);
            }}
            onSuccess={async () => {
              setShowModal(false);
              setEditingPremio(null);
              colaboradorService.list().then(setColaboradoresList).catch(console.error);
              await loadPremios();
              if (selectedColaborador) {
                await loadHistorico(selectedColaborador);
              }
              if (filters.ano && filters.mes) {
                await loadStats(filters.ano, filters.mes);
              }
            }}
          />
        )}
      </div>
    </Layout>
  );
};

interface PremioModalProps {
  premio: PremioProdutividade | null;
  colaboradoresList: Colaborador[];
  onClose: () => void;
  onSuccess: () => void;
}

const PremioModal: React.FC<PremioModalProps> = ({
  premio,
  colaboradoresList,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const defaultColaborador = premio
    ? null
    : colaboradoresList.length > 0
      ? colaboradoresList[0]
      : null;

  const [formData, setFormData] = useState({
    colaboradorId: premio?.colaboradorId || defaultColaborador?.id || "",
    colaboradorNome: premio?.colaboradorNome || defaultColaborador?.nome || "",
    cpf: maskCPF(premio?.cpf || defaultColaborador?.cpf || ""),
    cargo: premio?.cargo || defaultColaborador?.cargo || "",
    setor: premio?.setor || defaultColaborador?.setor || "",
    valor: premio?.valor || 0,
    valorDisplay: (premio?.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    dataPremio: premio?.dataPremio
      ? new Date(premio.dataPremio).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    motivo: premio?.motivo || "",
    status: premio?.status || "Pendente",
    observacoes: premio?.observacoes || "",
  });

  const [selectedMock, setSelectedMock] = useState(
    premio?.colaboradorId || defaultColaborador?.id || ""
  );
  const [saving, setSaving] = useState(false);

  const handleColaboradorChange = (value: string) => {
    setSelectedMock(value);
    const colaborador = colaboradoresList.find((c) => c.id === value);
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

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    
    if (name === "cpf") {
      setFormData((prev) => ({
        ...prev,
        cpf: maskCPF(value),
      }));
    } else if (name === "valor") {
      // Remove tudo que não é dígito
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
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validações básicas
      if (!formData.colaboradorNome.trim()) {
        showToast("Selecione um colaborador", "error");
        setSaving(false);
        return;
      }

      if (!formData.motivo.trim()) {
        showToast("Informe o motivo do prêmio", "error");
        setSaving(false);
        return;
      }

      if (formData.valor <= 0) {
        showToast("O valor deve ser maior que zero", "error");
        setSaving(false);
        return;
      }

      const payload: PremioFormData = {
        colaboradorId: formData.colaboradorId || generateTempId(),
        colaboradorNome: formData.colaboradorNome,
        cpf: unmaskCPF(formData.cpf),
        cargo: formData.cargo,
        setor: formData.setor,
        valor: formData.valor,
        dataPremio: new Date(formData.dataPremio),
        motivo: formData.motivo,
        status: formData.status as PremioStatus,
        observacoes: formData.observacoes,
      };

      if (premio) {
        await premioProdutividadeService.update(premio.id, payload);
        showToast("Prêmio atualizado com sucesso!", "success");
      } else {
        await premioProdutividadeService.create(payload);
        showToast("Prêmio criado com sucesso!", "success");
      }

      onSuccess();
    } catch (error: any) {
      console.error("Erro ao salvar prêmio:", error);
      const errorMessage = error?.message || "Não foi possível salvar o prêmio.";
      showToast(errorMessage, "error");
    } finally {
      setSaving(false);
    }
  };

  return renderModalPortal(
    <div className="premios-modal-overlay" onClick={onClose}>
      <div className="premios-modal" onClick={(e) => e.stopPropagation()}>
        <div className="premios-modal-header">
          <h2>{premio ? "Editar prêmio" : "Novo prêmio de produtividade"}</h2>
          <button onClick={onClose}>×</button>
        </div>

        <form className="premios-modal-form" onSubmit={handleSubmit}>
          <div className="premios-modal-section">
            <div className="premios-modal-row">
              <div className="premios-modal-group">
                <label>Colaborador</label>
                <select
                  value={selectedMock}
                  onChange={(e) => handleColaboradorChange(e.target.value)}
                >
                  <option value="">Novo colaborador (preencher abaixo)</option>
                  {colaboradoresList.map((colaborador) => (
                    <option key={colaborador.id} value={colaborador.id}>
                      {colaborador.nome} · {colaborador.cargo}
                    </option>
                  ))}
                </select>
              </div>
              <div className="premios-modal-group">
                <label>Nome *</label>
                <input
                  type="text"
                  name="colaboradorNome"
                  value={formData.colaboradorNome}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="premios-modal-row">
              <div className="premios-modal-group">
                <label>CPF *</label>
                <input
                  type="text"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleChange}
                  required
                  placeholder="000.000.000-00"
                />
              </div>
              <div className="premios-modal-group">
                <label>Cargo *</label>
                <input
                  type="text"
                  name="cargo"
                  value={formData.cargo}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="premios-modal-group">
                <label>Setor *</label>
                <input
                  type="text"
                  name="setor"
                  value={formData.setor}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          <div className="premios-modal-section">
            <div className="premios-modal-row">
              <div className="premios-modal-group">
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
              <div className="premios-modal-group">
                <label>Data *</label>
                <input
                  type="date"
                  name="dataPremio"
                  value={formData.dataPremio}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="premios-modal-group">
                <label>Status *</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="premios-modal-group">
              <label>Motivo *</label>
              <textarea
                name="motivo"
                value={formData.motivo}
                onChange={handleChange}
                rows={3}
                required
                placeholder="Descreva o motivo do prêmio..."
              />
            </div>

            <div className="premios-modal-group">
              <label>Observações</label>
              <textarea
                name="observacoes"
                value={formData.observacoes}
                onChange={handleChange}
                rows={3}
                placeholder="Observações adicionais..."
              />
            </div>
          </div>

          <div className="premios-modal-actions">
            <button
              type="button"
              className="premios-secondary-btn"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="premios-primary-btn"
              disabled={saving}
            >
              {saving ? "Salvando..." : premio ? "Atualizar" : "Cadastrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PremiosProdutividade;
