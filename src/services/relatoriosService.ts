import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { db } from "../lib/firebaseconfig";
import { documentacoesService } from "./documentacoesService";
import type { Documento } from "../types/documentacoes";
import type {
  RelatorioConsolidado,
  ResumoRelatorio,
  ResumoPremios,
  ResumoBoletins,
  ResumoDocumentacoes,
  ResumoRecebimentos,
} from "../types/relatorios";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const premiosCollection = collection(db, "premiosProdutividade");
const boletinsCollection = collection(db, "boletinsMedicao");
const lancamentosCollection = collection(db, "lancamentosDiarios");

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export const relatoriosService = {
  async gerarRelatorioConsolidado(
    mes: number,
    ano: number,
    colaboradorId?: string,
    colaboradorNome?: string
  ): Promise<RelatorioConsolidado> {
    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = new Date(ano, mes, 0, 23, 59, 59, 999);

    const [premiosData, boletinsData, lancamentosData, documentosList] =
      await Promise.all([
        this.getPremiosPorPeriodo(inicioMes, fimMes, colaboradorId),
        this.getBoletinsPorPeriodo(inicioMes, fimMes),
        this.getRecebimentosPorPeriodo(inicioMes, fimMes, colaboradorId),
        documentacoesService.list(),
      ]);

    const resumoPremios: ResumoPremios = {
      quantidade: premiosData.length,
      valorTotal: premiosData.reduce((sum, p) => sum + p.valor, 0),
      aprovados: premiosData.filter((p) => p.status === "Aprovado").length,
      pendentes: premiosData.filter((p) => p.status === "Pendente").length,
      emRevisao: premiosData.filter((p) => p.status === "Em revisão").length,
    };

    const resumoBoletins: ResumoBoletins = {
      quantidade: boletinsData.length,
      valorTotal: boletinsData.reduce((sum, b) => sum + b.valor, 0),
      emitidos: boletinsData.filter((b) => b.status === "Emitido").length,
      pendentes: boletinsData.filter((b) => b.status === "Pendente").length,
      aguardandoAssinatura: boletinsData.filter(
        (b) => b.status === "Aguardando assinatura"
      ).length,
    };

    const resumoRecebimentos: ResumoRecebimentos = {
      quantidade: lancamentosData.filter(
        (l) => l.tipoMovimentacao === "Recebimento"
      ).length,
      valorTotal: lancamentosData
        .filter((l) => l.tipoMovimentacao === "Recebimento")
        .reduce((sum, l) => sum + l.valor, 0),
      recebidos: lancamentosData.filter(
        (l) => l.tipoMovimentacao === "Recebimento" && l.status === "Recebido"
      ).length,
      pendentes: lancamentosData.filter(
        (l) => l.tipoMovimentacao === "Recebimento" && l.status === "Pendente"
      ).length,
    };

    const documentosFiltrados = colaboradorId
      ? documentosList.filter((d) => d.colaboradorId === colaboradorId)
      : documentosList;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const seteDias = new Date(hoje);
    seteDias.setDate(seteDias.getDate() + 7);
    const trintaDias = new Date(hoje);
    trintaDias.setDate(trintaDias.getDate() + 30);

    const resumoDocumentacoes: ResumoDocumentacoes = {
      total: documentosFiltrados.length,
      vencidas: documentosFiltrados.filter((d) => d.status === "Vencido").length,
      vencendoEm7Dias: documentosFiltrados.filter(
        (d) =>
          d.status === "Vencendo" &&
          d.dataValidade >= hoje &&
          d.dataValidade <= seteDias
      ).length,
      vencendoEm30Dias: documentosFiltrados.filter(
        (d) =>
          d.dataValidade >= hoje &&
          d.dataValidade <= trintaDias &&
          d.status !== "Vencido"
      ).length,
      emDia: documentosFiltrados.filter(
        (d) => d.status === "Válido" && d.dataValidade > trintaDias
      ).length,
    };

    const resumo: ResumoRelatorio = {
      totalPremiosPagos: resumoPremios.valorTotal,
      totalBoletinsEmitidos: resumoBoletins.valorTotal,
      totalDocumentacoesVencidas: resumoDocumentacoes.vencidas,
      totalRecebimentos: resumoRecebimentos.valorTotal,
      totalGeral:
        resumoPremios.valorTotal +
        resumoBoletins.valorTotal +
        resumoRecebimentos.valorTotal,
    };

    const relatorio: RelatorioConsolidado = {
      id: colaboradorId
        ? `relatorio-${ano}-${mes}-${colaboradorId}`
        : `relatorio-${ano}-${mes}`,
      mes,
      ano,
      dataGeracao: new Date(),
      geradoPor: "current-user",
      geradoPorNome: "Usuário",
      resumo,
      premios: resumoPremios,
      boletins: resumoBoletins,
      documentacoes: resumoDocumentacoes,
      recebimentos: resumoRecebimentos,
    };

    if (colaboradorId && colaboradorNome) {
      relatorio.colaboradorId = colaboradorId;
      relatorio.colaboradorNome = colaboradorNome;
    }

    return relatorio;
  },

  async getPremiosPorPeriodo(
    dataInicio: Date,
    dataFim: Date,
    colaboradorId?: string
  ): Promise<Array<{ valor: number; status: string }>> {
    const q = query(
      premiosCollection,
      where("dataPremio", ">=", Timestamp.fromDate(dataInicio)),
      where("dataPremio", "<=", Timestamp.fromDate(dataFim)),
      orderBy("dataPremio", "desc")
    );
    const snapshot = await getDocs(q);
    let items = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        valor: data.valor || 0,
        status: data.status || "Pendente",
        colaboradorId: data.colaboradorId as string | undefined,
      };
    });
    if (colaboradorId) {
      items = items.filter((p) => p.colaboradorId === colaboradorId);
    }
    return items.map(({ valor, status }) => ({ valor, status }));
  },

  async getBoletinsPorPeriodo(
    dataInicio: Date,
    dataFim: Date
  ): Promise<Array<{ valor: number; status: string }>> {
    const q = query(
      boletinsCollection,
      where("dataEmissao", ">=", Timestamp.fromDate(dataInicio)),
      where("dataEmissao", "<=", Timestamp.fromDate(dataFim)),
      orderBy("dataEmissao", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        valor: data.valor || 0,
        status: data.status || "Pendente",
      };
    });
  },

  async getRecebimentosPorPeriodo(
    dataInicio: Date,
    dataFim: Date,
    colaboradorId?: string
  ): Promise<
    Array<{ valor: number; status: string; tipoMovimentacao: string }>
  > {
    const q = query(
      lancamentosCollection,
      where("dataLancamento", ">=", Timestamp.fromDate(dataInicio)),
      where("dataLancamento", "<=", Timestamp.fromDate(dataFim)),
      orderBy("dataLancamento", "desc")
    );
    const snapshot = await getDocs(q);
    let items = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        valor: data.valor || 0,
        status: data.status || "Pendente",
        tipoMovimentacao: data.tipoMovimentacao || "Outro",
        colaboradorId: data.colaboradorId as string | undefined,
      };
    });
    if (colaboradorId) {
      items = items.filter((l) => l.colaboradorId === colaboradorId);
    }
    return items.map(({ valor, status, tipoMovimentacao }) => ({
      valor,
      status,
      tipoMovimentacao,
    }));
  },

  async exportarRelatorioPDF(relatorio: RelatorioConsolidado): Promise<Blob> {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.getPageWidth();
    let y = 18;

    doc.setFontSize(18);
    doc.setTextColor(30, 64, 175);
    doc.text("Relatório Consolidado Mensal", 14, y);
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Período: ${MESES[relatorio.mes - 1]}/${relatorio.ano}`, 14, y);
    y += 6;
    doc.text(
      `Data de geração: ${new Date(relatorio.dataGeracao).toLocaleDateString("pt-BR")}`,
      14,
      y
    );
    y += 6;
    doc.text(`Gerado por: ${relatorio.geradoPorNome}`, 14, y);
    if (relatorio.colaboradorNome) {
      y += 6;
      doc.setTextColor(59, 130, 246);
      doc.text(`Filtrado por: ${relatorio.colaboradorNome}`, 14, y);
      doc.setTextColor(0, 0, 0);
    }
    y += 12;

    doc.setFontSize(12);
    doc.setTextColor(45, 55, 72);
    doc.text("Resumo geral", 14, y);
    y += 8;

    const resumoRows = [
      ["Total de prêmios pagos", formatCurrency(relatorio.resumo.totalPremiosPagos)],
      ["Total de boletins emitidos", formatCurrency(relatorio.resumo.totalBoletinsEmitidos)],
      ["Total de recebimentos", formatCurrency(relatorio.resumo.totalRecebimentos)],
      ["Total geral", formatCurrency(relatorio.resumo.totalGeral)],
    ];
    autoTable(doc, {
      startY: y,
      head: [["Item", "Valor"]],
      body: resumoRows,
      theme: "grid",
      headStyles: { fillColor: [66, 133, 244] },
      margin: { left: 14 },
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

    const tables: Array<{ title: string; head: string[]; body: (string | number)[][] }> = [
      {
        title: "Prêmios de produtividade",
        head: ["Quantidade", "Valor total", "Aprovados", "Pendentes", "Em revisão"],
        body: [
          [
            relatorio.premios.quantidade,
            formatCurrency(relatorio.premios.valorTotal),
            relatorio.premios.aprovados,
            relatorio.premios.pendentes,
            relatorio.premios.emRevisao,
          ],
        ],
      },
      {
        title: "Boletins de medição",
        head: ["Quantidade", "Valor total", "Emitidos", "Pendentes", "Aguard. assinatura"],
        body: [
          [
            relatorio.boletins.quantidade,
            formatCurrency(relatorio.boletins.valorTotal),
            relatorio.boletins.emitidos,
            relatorio.boletins.pendentes,
            relatorio.boletins.aguardandoAssinatura,
          ],
        ],
      },
      {
        title: "Documentações",
        head: [
          "Total",
          "Vencidas",
          "Vencendo 7 dias",
          "Vencendo 30 dias",
          "Em dia",
        ],
        body: [
          [
            relatorio.documentacoes.total,
            relatorio.documentacoes.vencidas,
            relatorio.documentacoes.vencendoEm7Dias,
            relatorio.documentacoes.vencendoEm30Dias,
            relatorio.documentacoes.emDia,
          ],
        ],
      },
      {
        title: "Recebimentos",
        head: ["Quantidade", "Valor total", "Recebidos", "Pendentes"],
        body: [
          [
            relatorio.recebimentos.quantidade,
            formatCurrency(relatorio.recebimentos.valorTotal),
            relatorio.recebimentos.recebidos,
            relatorio.recebimentos.pendentes,
          ],
        ],
      },
    ];

    for (const t of tables) {
      if (y > 250) {
        doc.addPage();
        y = 18;
      }
      doc.setFontSize(11);
      doc.text(t.title, 14, y);
      y += 6;
      autoTable(doc, {
        startY: y,
        head: [t.head],
        body: t.body,
        theme: "grid",
        headStyles: { fillColor: [100, 116, 139] },
        margin: { left: 14 },
      });
      y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
    }

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Gerado em ${new Date().toLocaleString("pt-BR")} — Sistema de Gestão`,
      pageWidth / 2,
      doc.getPageHeight() - 10,
      { align: "center" }
    );

    return doc.output("blob");
  },

  async exportarRelatorioExcel(relatorio: RelatorioConsolidado): Promise<Blob> {
    const formatCurrencyExcel = (value: number) =>
      value.toFixed(2).replace(".", ",");

    const rows: string[][] = [
      ["Relatório Consolidado Mensal"],
      [`Período: ${MESES[relatorio.mes - 1]}/${relatorio.ano}`],
      [`Data de Geração: ${new Date(relatorio.dataGeracao).toLocaleDateString("pt-BR")}`],
      [`Gerado por: ${relatorio.geradoPorNome}`],
    ];
    if (relatorio.colaboradorNome) {
      rows.push([`Filtrado por: ${relatorio.colaboradorNome}`]);
    }
    rows.push(
      [],
      ["RESUMO GERAL"],
      ["Total de Prêmios Pagos", formatCurrencyExcel(relatorio.resumo.totalPremiosPagos)],
      ["Total de Boletins Emitidos", formatCurrencyExcel(relatorio.resumo.totalBoletinsEmitidos)],
      ["Total de Recebimentos", formatCurrencyExcel(relatorio.resumo.totalRecebimentos)],
      ["TOTAL GERAL", formatCurrencyExcel(relatorio.resumo.totalGeral)],
      [],
      ["PRÊMIOS DE PRODUTIVIDADE"],
      ["Quantidade", "Valor Total", "Aprovados", "Pendentes", "Em Revisão"],
      [
        relatorio.premios.quantidade.toString(),
        formatCurrencyExcel(relatorio.premios.valorTotal),
        relatorio.premios.aprovados.toString(),
        relatorio.premios.pendentes.toString(),
        relatorio.premios.emRevisao.toString(),
      ],
      [],
      ["BOLETINS DE MEDIÇÃO"],
      ["Quantidade", "Valor Total", "Emitidos", "Pendentes", "Aguardando Assinatura"],
      [
        relatorio.boletins.quantidade.toString(),
        formatCurrencyExcel(relatorio.boletins.valorTotal),
        relatorio.boletins.emitidos.toString(),
        relatorio.boletins.pendentes.toString(),
        relatorio.boletins.aguardandoAssinatura.toString(),
      ],
      [],
      ["DOCUMENTAÇÕES"],
      [
        "Total",
        "Vencidas",
        "Vencendo em 7 dias",
        "Vencendo em 30 dias",
        "Em dia",
      ],
      [
        relatorio.documentacoes.total.toString(),
        relatorio.documentacoes.vencidas.toString(),
        relatorio.documentacoes.vencendoEm7Dias.toString(),
        relatorio.documentacoes.vencendoEm30Dias.toString(),
        relatorio.documentacoes.emDia.toString(),
      ],
      [],
      ["RECEBIMENTOS"],
      ["Quantidade", "Valor Total", "Recebidos", "Pendentes"],
      [
        relatorio.recebimentos.quantidade.toString(),
        formatCurrencyExcel(relatorio.recebimentos.valorTotal),
        relatorio.recebimentos.recebidos.toString(),
        relatorio.recebimentos.pendentes.toString(),
      ]
    );

    const csvContent = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")
      )
      .join("\n");

    return new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
  },

  /**
   * Retorna documentos vencidos e vencendo para o relatório dedicado.
   * Usa list() para respeitar fallback local quando Firebase não está configurado.
   */
  async getDocumentosParaRelatorioVencidos(
    colaboradorId?: string
  ): Promise<Documento[]> {
    const todos = await documentacoesService.list();
    const filtrados = todos.filter(
      (d) => d.status === "Vencido" || d.status === "Vencendo"
    );
    if (colaboradorId) {
      return filtrados.filter((d) => d.colaboradorId === colaboradorId);
    }
    return filtrados;
  },

  async exportarDocumentosVencidosPDF(
    documentos: Documento[],
    incluirVencendo: boolean
  ): Promise<Blob> {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.getPageWidth();
    let y = 18;

    doc.setFontSize(18);
    doc.setTextColor(30, 64, 175);
    doc.text("Relatório de Documentos Vencidos", 14, y);
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(
      `Data de geração: ${new Date().toLocaleDateString("pt-BR")}`,
      14,
      y
    );
    y += 6;
    doc.text(
      `Total de registros: ${documentos.length}${incluirVencendo ? " (vencidos + vencendo)" : ""}`,
      14,
      y
    );
    y += 12;

    if (documentos.length === 0) {
      doc.setFontSize(11);
      doc.text("Nenhum documento vencido ou vencendo no momento.", 14, y);
      return doc.output("blob");
    }

    doc.setFontSize(12);
    doc.setTextColor(45, 55, 72);
    doc.text("Listagem", 14, y);
    y += 8;

    const headers = [
      "Colaborador",
      "Tipo",
      "Validade",
      "Status",
    ];
    const body = documentos.map((d) => [
      d.colaboradorNome || "",
      d.tipoDocumento || "",
      new Date(d.dataValidade).toLocaleDateString("pt-BR"),
      d.status || "",
    ]);

    autoTable(doc, {
      startY: y,
      head: [headers],
      body,
      theme: "grid",
      headStyles: { fillColor: [66, 133, 244] },
      margin: { left: 14 },
      styles: { fontSize: 9 },
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

    if (y > 250 && documentos.length > 0) {
      doc.addPage();
      y = 18;
    }

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Gerado em ${new Date().toLocaleString("pt-BR")} — Sistema de Gestão`,
      pageWidth / 2,
      doc.getPageHeight() - 10,
      { align: "center" }
    );

    return doc.output("blob");
  },

  async exportarDocumentosVencidosExcel(documentos: Documento[]): Promise<Blob> {
    const headers = [
      "Colaborador",
      "CPF",
      "Cargo",
      "Setor",
      "Tipo Documento",
      "Nº Documento",
      "Data Validade",
      "Status",
    ];
    const rows = documentos.map((d) => [
      d.colaboradorNome ?? "",
      d.cpf ?? "",
      d.cargo ?? "",
      d.setor ?? "",
      d.tipoDocumento ?? "",
      d.numeroDocumento ?? "",
      new Date(d.dataValidade).toLocaleDateString("pt-BR"),
      d.status ?? "",
    ]);
    const csvRows = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")
      )
      .join("\n");
    return new Blob(["\uFEFF" + csvRows], {
      type: "text/csv;charset=utf-8;",
    });
  },
};
