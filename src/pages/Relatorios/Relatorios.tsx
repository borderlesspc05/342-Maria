import React, { useState, useEffect, useCallback } from "react";
import { Layout } from "../../components/Layout";
import {
  HiDocumentReport,
  HiDownload,
  HiDocumentText,
  HiChartBar,
  HiCalendar,
  HiUser,
  HiExclamationCircle,
  HiRefresh,
} from "react-icons/hi";
import { relatoriosService } from "../../services/relatoriosService";
import { colaboradorService } from "../../services/colaboradorService";
import { useToast } from "../../contexts/ToastContext";
import type { RelatorioConsolidado } from "../../types/relatorios";
import type { Colaborador } from "../../types/premioProdutividade";
import type { Documento } from "../../types/documentacoes";
import "./Relatorios.css";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type TabRelatorio = "consolidado" | "documentos-vencidos";

const Relatorios: React.FC = () => {
  const hoje = new Date();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabRelatorio>("consolidado");

  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [colaboradorId, setColaboradorId] = useState<string>("");
  const [colaboradoresList, setColaboradoresList] = useState<Colaborador[]>([]);
  const [relatorio, setRelatorio] = useState<RelatorioConsolidado | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  const [docVencidosColaboradorId, setDocVencidosColaboradorId] = useState<string>("");
  const [documentosVencidos, setDocumentosVencidos] = useState<Documento[]>([]);
  const [loadingDocVencidos, setLoadingDocVencidos] = useState(false);
  const [exportingDocPDF, setExportingDocPDF] = useState(false);
  const [exportingDocExcel, setExportingDocExcel] = useState(false);
  const [docVencidosLoaded, setDocVencidosLoaded] = useState(false);

  useEffect(() => {
    colaboradorService.list().then(setColaboradoresList).catch(() => {
      showToast("Não foi possível carregar a lista de colaboradores.", "error");
    });
  }, [showToast]);

  const handleCarregarDocumentosVencidos = useCallback(async () => {
    try {
      setLoadingDocVencidos(true);
      setDocumentosVencidos([]);
      const lista = await relatoriosService.getDocumentosParaRelatorioVencidos(
        docVencidosColaboradorId || undefined
      );
      setDocumentosVencidos(lista);
      setDocVencidosLoaded(true);
      showToast(
        lista.length > 0
          ? `${lista.length} documento(s) vencido(s) ou vencendo carregado(s).`
          : "Nenhum documento vencido ou vencendo no momento."
      );
    } catch (error) {
      console.error("Erro ao carregar documentos vencidos:", error);
      showToast("Não foi possível carregar o relatório de documentos.", "error");
    } finally {
      setLoadingDocVencidos(false);
    }
  }, [docVencidosColaboradorId, showToast]);

  const handleExportDocVencidosPDF = async () => {
    if (documentosVencidos.length === 0) return;
    try {
      setExportingDocPDF(true);
      const blob = await relatoriosService.exportarDocumentosVencidosPDF(
        documentosVencidos,
        true
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `documentos_vencidos_${new Date().toISOString().slice(0, 10)}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      showToast("PDF exportado com sucesso.");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      showToast("Não foi possível exportar o PDF.", "error");
    } finally {
      setExportingDocPDF(false);
    }
  };

  const handleExportDocVencidosExcel = async () => {
    if (documentosVencidos.length === 0) return;
    try {
      setExportingDocExcel(true);
      const blob = await relatoriosService.exportarDocumentosVencidosExcel(
        documentosVencidos
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `documentos_vencidos_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      showToast("Planilha exportada com sucesso.");
    } catch (error) {
      console.error("Erro ao exportar Excel:", error);
      showToast("Não foi possível exportar a planilha.", "error");
    } finally {
      setExportingDocExcel(false);
    }
  };

  const handleGerarRelatorio = async () => {
    try {
      setLoading(true);
      setRelatorio(null);
      const colaboradorNome =
        colaboradorId
          ? colaboradoresList.find((c) => c.id === colaboradorId)?.nome
          : undefined;
      const data = await relatoriosService.gerarRelatorioConsolidado(
        mes,
        ano,
        colaboradorId || undefined,
        colaboradorNome
      );
      setRelatorio(data);
      showToast("Relatório gerado com sucesso.");
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      showToast("Não foi possível gerar o relatório.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!relatorio) return;
    try {
      setExportingPDF(true);
      const blob = await relatoriosService.exportarRelatorioPDF(relatorio);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const nomeBase = relatorio.colaboradorNome
        ? `relatorio_${relatorio.colaboradorNome.replace(/\s+/g, "_")}_${MESES[mes - 1]}_${ano}`
        : `relatorio_consolidado_${MESES[mes - 1]}_${ano}`;
      link.download = `${nomeBase}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      showToast("PDF exportado com sucesso.");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      showToast("Não foi possível exportar o PDF.", "error");
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExportExcel = async () => {
    if (!relatorio) return;
    try {
      setExportingExcel(true);
      const blob = await relatoriosService.exportarRelatorioExcel(relatorio);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const nomeBase = relatorio.colaboradorNome
        ? `relatorio_${relatorio.colaboradorNome.replace(/\s+/g, "_")}_${MESES[mes - 1]}_${ano}`
        : `relatorio_consolidado_${MESES[mes - 1]}_${ano}`;
      link.download = `${nomeBase}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      showToast("Excel exportado com sucesso.");
    } catch (error) {
      console.error("Erro ao exportar Excel:", error);
      showToast("Não foi possível exportar o Excel.", "error");
    } finally {
      setExportingExcel(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  return (
    <Layout>
      <div className="relatorios-container">
        <div className="relatorios-header">
          <div>
            <h1 className="relatorios-title">Relatórios e Controle Geral</h1>
            <p className="relatorios-subtitle">
              {activeTab === "consolidado"
                ? "Gere relatórios consolidados mensais com todos os dados do sistema"
                : "Consulte e exporte documentos vencidos ou próximos do vencimento"}
            </p>
          </div>
        </div>

        <div className="relatorios-tabs" role="tablist" aria-label="Tipo de relatório">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "consolidado"}
            aria-controls="relatorio-consolidado-panel"
            id="tab-consolidado"
            className={`relatorios-tab ${activeTab === "consolidado" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("consolidado");
              setDocVencidosLoaded(false);
            }}
          >
            <HiChartBar className="relatorios-tab-icon" aria-hidden />
            <span className="relatorios-tab-label">Relatório consolidado</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "documentos-vencidos"}
            aria-controls="relatorio-doc-vencidos-panel"
            id="tab-documentos-vencidos"
            className={`relatorios-tab ${activeTab === "documentos-vencidos" ? "active" : ""}`}
            onClick={() => setActiveTab("documentos-vencidos")}
          >
            <HiExclamationCircle className="relatorios-tab-icon" aria-hidden />
            <span className="relatorios-tab-label">Documentos vencidos</span>
          </button>
        </div>

        {activeTab === "documentos-vencidos" && (
          <div
            id="relatorio-doc-vencidos-panel"
            role="tabpanel"
            aria-labelledby="tab-documentos-vencidos"
            className="relatorios-panel"
          >
            <div className="relatorios-filters-card">
              <div className="relatorios-filters-header">
                <HiExclamationCircle className="relatorios-filter-icon" />
                <h2>Filtros</h2>
              </div>
              <div className="relatorios-filters-content">
                <div className="relatorios-filter-group relatorios-filter-group-colaborador">
                  <label>
                    <HiUser className="relatorios-filter-label-icon" />
                    Colaborador
                  </label>
                  <select
                    value={docVencidosColaboradorId}
                    onChange={(e) => setDocVencidosColaboradorId(e.target.value)}
                    aria-label="Filtrar por colaborador"
                  >
                    <option value="">Todos</option>
                    {colaboradoresList.map((colab) => (
                      <option key={colab.id} value={colab.id}>
                        {colab.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="relatorios-generate-btn"
                  onClick={handleCarregarDocumentosVencidos}
                  disabled={loadingDocVencidos}
                >
                  <HiRefresh
                    className={loadingDocVencidos ? "spin" : ""}
                    aria-hidden
                  />
                  {loadingDocVencidos ? "Carregando..." : "Carregar relatório"}
                </button>
              </div>
            </div>

            {docVencidosLoaded && (
              <>
                <div className="relatorios-doc-vencidos-summary">
                  <span className="relatorios-doc-vencidos-count">
                    {documentosVencidos.length} documento(s) vencido(s) ou vencendo
                  </span>
                </div>

                {documentosVencidos.length > 0 ? (
                  <div className="relatorios-table-card">
                    <div className="relatorios-table-wrapper">
                      <table className="relatorios-table" role="table">
                        <thead>
                          <tr>
                            <th scope="col">Colaborador</th>
                            <th scope="col">Tipo</th>
                            <th scope="col">Validade</th>
                            <th scope="col">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {documentosVencidos.map((doc) => (
                            <tr key={doc.id}>
                              <td>{doc.colaboradorNome}</td>
                              <td>{doc.tipoDocumento}</td>
                              <td>
                                {new Date(doc.dataValidade).toLocaleDateString("pt-BR")}
                              </td>
                              <td>
                                <span
                                  className={`relatorios-doc-status relatorios-doc-status--${doc.status === "Vencido" ? "vencido" : "vencendo"}`}
                                >
                                  {doc.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="relatorios-empty" role="status">
                    <HiExclamationCircle className="relatorios-empty-icon" />
                    <p>Nenhum documento vencido ou vencendo no momento.</p>
                  </div>
                )}

                <div className="relatorios-export-actions">
                  <button
                    type="button"
                    className="relatorios-export-btn pdf"
                    onClick={handleExportDocVencidosPDF}
                    disabled={exportingDocPDF || documentosVencidos.length === 0}
                  >
                    <HiDownload />
                    {exportingDocPDF ? "Exportando..." : "Exportar PDF"}
                  </button>
                  <button
                    type="button"
                    className="relatorios-export-btn excel"
                    onClick={handleExportDocVencidosExcel}
                    disabled={exportingDocExcel || documentosVencidos.length === 0}
                  >
                    <HiDownload />
                    {exportingDocExcel ? "Exportando..." : "Exportar Excel"}
                  </button>
                </div>
              </>
            )}

            {docVencidosLoaded === false && !loadingDocVencidos && (
              <div className="relatorios-empty">
                <HiDocumentReport className="relatorios-empty-icon" />
                <p>Use os filtros e clique em &quot;Carregar relatório&quot; para listar documentos vencidos ou vencendo.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "consolidado" && (
          <div
            id="relatorio-consolidado-panel"
            role="tabpanel"
            aria-labelledby="tab-consolidado"
            className="relatorios-panel"
          >
        <div className="relatorios-filters-card">
          <div className="relatorios-filters-header">
            <HiCalendar className="relatorios-filter-icon" />
            <h2>Filtros do Relatório</h2>
          </div>
          <div className="relatorios-filters-content">
            <div className="relatorios-filter-group">
              <label>Mês</label>
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                aria-label="Mês"
              >
                {MESES.map((mesNome, index) => (
                  <option key={mesNome} value={index + 1}>
                    {mesNome}
                  </option>
                ))}
              </select>
            </div>

            <div className="relatorios-filter-group">
              <label>Ano</label>
              <select
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                aria-label="Ano"
              >
                {Array.from(
                  { length: 5 },
                  (_, index) => hoje.getFullYear() - index
                ).map((anoOption) => (
                  <option key={anoOption} value={anoOption}>
                    {anoOption}
                  </option>
                ))}
              </select>
            </div>

            <div className="relatorios-filter-group relatorios-filter-group-colaborador">
              <label>
                <HiUser className="relatorios-filter-label-icon" />
                Colaborador
              </label>
              <select
                value={colaboradorId}
                onChange={(e) => setColaboradorId(e.target.value)}
                aria-label="Filtrar por colaborador"
              >
                <option value="">Todos</option>
                {colaboradoresList.map((colab) => (
                  <option key={colab.id} value={colab.id}>
                    {colab.nome}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="relatorios-generate-btn"
              onClick={handleGerarRelatorio}
              disabled={loading}
            >
              <HiDocumentReport />
              {loading ? "Gerando..." : "Gerar Relatório"}
            </button>
          </div>
        </div>

        {relatorio && (
          <>
            {relatorio.colaboradorNome && (
              <div className="relatorios-filter-badge" role="status">
                <HiUser />
                <span>Filtrado por: {relatorio.colaboradorNome}</span>
              </div>
            )}

            <div className="relatorios-summary-cards">
              <div className="relatorios-summary-card">
                <div className="relatorios-summary-icon verde">
                  <HiChartBar />
                </div>
                <div className="relatorios-summary-content">
                  <h3>Prêmios Pagos</h3>
                  <p className="relatorios-summary-value">
                    {formatCurrency(relatorio.resumo.totalPremiosPagos)}
                  </p>
                </div>
              </div>

              <div className="relatorios-summary-card">
                <div className="relatorios-summary-icon azul">
                  <HiDocumentText />
                </div>
                <div className="relatorios-summary-content">
                  <h3>Boletins Emitidos</h3>
                  <p className="relatorios-summary-value">
                    {formatCurrency(relatorio.resumo.totalBoletinsEmitidos)}
                  </p>
                </div>
              </div>

              <div className="relatorios-summary-card">
                <div className="relatorios-summary-icon laranja">
                  <HiDocumentText />
                </div>
                <div className="relatorios-summary-content">
                  <h3>Documentações Vencidas</h3>
                  <p className="relatorios-summary-value">
                    {relatorio.documentacoes.vencidas}
                  </p>
                </div>
              </div>

              <div className="relatorios-summary-card">
                <div className="relatorios-summary-icon verde">
                  <HiChartBar />
                </div>
                <div className="relatorios-summary-content">
                  <h3>Recebimentos</h3>
                  <p className="relatorios-summary-value">
                    {formatCurrency(relatorio.resumo.totalRecebimentos)}
                  </p>
                </div>
              </div>

              <div className="relatorios-summary-card total">
                <div className="relatorios-summary-icon roxo">
                  <HiChartBar />
                </div>
                <div className="relatorios-summary-content">
                  <h3>Total Geral</h3>
                  <p className="relatorios-summary-value total-value">
                    {formatCurrency(relatorio.resumo.totalGeral)}
                  </p>
                </div>
              </div>
            </div>

            <div className="relatorios-details">
              <div className="relatorios-detail-section">
                <h3>Prêmios de Produtividade</h3>
                <div className="relatorios-detail-grid">
                  <div className="relatorios-detail-item">
                    <span className="relatorios-detail-label">Quantidade</span>
                    <span className="relatorios-detail-value">
                      {relatorio.premios.quantidade}
                    </span>
                  </div>
                  <div className="relatorios-detail-item">
                    <span className="relatorios-detail-label">Valor Total</span>
                    <span className="relatorios-detail-value">
                      {formatCurrency(relatorio.premios.valorTotal)}
                    </span>
                  </div>
                  <div className="relatorios-detail-item">
                    <span className="relatorios-detail-label">Aprovados</span>
                    <span className="relatorios-detail-value">
                      {relatorio.premios.aprovados}
                    </span>
                  </div>
                  <div className="relatorios-detail-item">
                    <span className="relatorios-detail-label">Pendentes</span>
                    <span className="relatorios-detail-value">
                      {relatorio.premios.pendentes}
                    </span>
                  </div>
                  <div className="relatorios-detail-item">
                    <span className="relatorios-detail-label">Em Revisão</span>
                    <span className="relatorios-detail-value">
                      {relatorio.premios.emRevisao}
                    </span>
                  </div>
                </div>
              </div>

              <div className="relatorios-detail-section">
                <h3>Boletins de Medição</h3>
                <div className="relatorios-detail-grid">
                  <div className="relatorios-detail-item">
                    <span className="relatorios-detail-label">Quantidade</span>
                    <span className="relatorios-detail-value">
                      {relatorio.boletins.quantidade}
                    </span>
                  </div>
                  <div className="relatorios-detail-item">
                    <span className="relatorios-detail-label">Valor Total</span>
                    <span className="relatorios-detail-value">
                      {formatCurrency(relatorio.boletins.valorTotal)}
                    </span>
                  </div>
                  <div className="relatorios-detail-item">
                    <span className="relatorios-detail-label">Emitidos</span>
                    <span className="relatorios-detail-value">
                      {relatorio.boletins.emitidos}
                    </span>
                  </div>
                  <div className="relatorios-detail-item">
                    <span className="relatorios-detail-label">Pendentes</span>
                    <span className="relatorios-detail-value">
                      {relatorio.boletins.pendentes}
                    </span>
                  </div>
                  <div className="relatorios-detail-item">
                    <span className="relatorios-detail-label">
                      Aguardando Assinatura
                    </span>
                    <span className="relatorios-detail-value">
                      {relatorio.boletins.aguardandoAssinatura}
                    </span>
                  </div>
                </div>
              </div>

              <div className="relatorios-detail-section">
                <h3>Documentações</h3>
                <div className="relatorios-detail-grid">
                  <div className="relatorios-detail-item">
                    <span className="relatorios-detail-label">Total</span>
                    <span className="relatorios-detail-value">
                      {relatorio.documentacoes.total}
                    </span>
                  </div>
                  <div className="relatorios-detail-item">
                    <span className="relatorios-detail-label">Vencidas</span>
                    <span className="relatorios-detail-value error">
                      {relatorio.documentacoes.vencidas}
                    </span>
                  </div>
                  <div className="relatorios-detail-item">
                    <span className="relatorios-detail-label">
                      Vencendo em 7 dias
                    </span>
                    <span className="relatorios-detail-value warning">
                      {relatorio.documentacoes.vencendoEm7Dias}
                    </span>
                  </div>
                  <div className="relatorios-detail-item">
                    <span className="relatorios-detail-label">
                      Vencendo em 30 dias
                    </span>
                    <span className="relatorios-detail-value warning">
                      {relatorio.documentacoes.vencendoEm30Dias}
                    </span>
                  </div>
                  <div className="relatorios-detail-item">
                    <span className="relatorios-detail-label">Em Dia</span>
                    <span className="relatorios-detail-value success">
                      {relatorio.documentacoes.emDia}
                    </span>
                  </div>
                </div>
              </div>

              <div className="relatorios-detail-section">
                <h3>Recebimentos</h3>
                <div className="relatorios-detail-grid">
                  <div className="relatorios-detail-item">
                    <span className="relatorios-detail-label">Quantidade</span>
                    <span className="relatorios-detail-value">
                      {relatorio.recebimentos.quantidade}
                    </span>
                  </div>
                  <div className="relatorios-detail-item">
                    <span className="relatorios-detail-label">Valor Total</span>
                    <span className="relatorios-detail-value">
                      {formatCurrency(relatorio.recebimentos.valorTotal)}
                    </span>
                  </div>
                  <div className="relatorios-detail-item">
                    <span className="relatorios-detail-label">Recebidos</span>
                    <span className="relatorios-detail-value success">
                      {relatorio.recebimentos.recebidos}
                    </span>
                  </div>
                  <div className="relatorios-detail-item">
                    <span className="relatorios-detail-label">Pendentes</span>
                    <span className="relatorios-detail-value warning">
                      {relatorio.recebimentos.pendentes}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="relatorios-export-actions">
              <button
                className="relatorios-export-btn pdf"
                onClick={handleExportPDF}
                disabled={exportingPDF}
              >
                <HiDownload />
                {exportingPDF ? "Exportando..." : "Exportar PDF"}
              </button>
              <button
                className="relatorios-export-btn excel"
                onClick={handleExportExcel}
                disabled={exportingExcel}
              >
                <HiDownload />
                {exportingExcel ? "Exportando..." : "Exportar Excel"}
              </button>
            </div>
          </>
        )}

        {!relatorio && !loading && (
          <div className="relatorios-empty">
            <HiDocumentReport className="relatorios-empty-icon" />
            <p>Selecione o período e gere um relatório consolidado</p>
          </div>
        )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Relatorios;
