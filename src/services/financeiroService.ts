import { auth, db } from "../lib/firebaseconfig";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  QueryConstraint,
} from "firebase/firestore";
import type {
  Transacao,
  TransacaoFormData,
  TransacaoFilters,
  FinanceiroStats,
  ResumoFinanceiro,
  StatusTransacao,
  FormaPagamento,
  CategoriaFinanceira,
  AnexoFinanceiro,
} from "../types/financeiro";
import {
  assertRole,
  validatePositiveNumber,
  validateRequiredString,
} from "./securityService";
import { isFirebaseConfigured } from "../utils/firebaseEnv";
const COLLECTION_NAME = "transacoes_financeiras";
const LOCAL_STORAGE_KEY = "financeiro_transacoes_local";

function getScopedLocalKey(): string {
  const uid = auth.currentUser?.uid ?? "anon";
  return `${LOCAL_STORAGE_KEY}:${uid}`;
}

function generateLocalId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getLocalTransacoes(): Transacao[] {
  try {
    const raw = localStorage.getItem(getScopedLocalKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    return parsed.map((t) => ({
      ...t,
      id: t.id as string,
      dataVencimento: t.dataVencimento ? new Date(t.dataVencimento as string) : new Date(),
      dataPagamento: t.dataPagamento ? new Date(t.dataPagamento as string) : undefined,
      aprovadoEm: t.aprovadoEm ? new Date(t.aprovadoEm as string) : undefined,
      pagoEm: t.pagoEm ? new Date(t.pagoEm as string) : undefined,
      criadoEm: t.criadoEm ? new Date(t.criadoEm as string) : new Date(),
      atualizadoEm: t.atualizadoEm ? new Date(t.atualizadoEm as string) : new Date(),
      anexos: (t.anexos as AnexoFinanceiro[]) || [],
    })) as Transacao[];
  } catch {
    return [];
  }
}

function saveLocalTransacoes(transacoes: Transacao[]): void {
  const toSave = transacoes.map((t) => ({
    ...t,
    dataVencimento: t.dataVencimento?.toISOString?.() ?? null,
    dataPagamento: t.dataPagamento?.toISOString?.() ?? null,
    aprovadoEm: t.aprovadoEm?.toISOString?.() ?? null,
    pagoEm: t.pagoEm?.toISOString?.() ?? null,
    criadoEm: t.criadoEm?.toISOString?.() ?? null,
    atualizadoEm: t.atualizadoEm?.toISOString?.() ?? null,
  }));
  localStorage.setItem(getScopedLocalKey(), JSON.stringify(toSave));
}

// Helper para converter Date para Timestamp
const dateToTimestamp = (date: Date): Timestamp => {
  return Timestamp.fromDate(date);
};

// Helper para converter Timestamp para Date
const timestampToDate = (timestamp: Timestamp): Date => {
  return timestamp.toDate();
};

// Função para gerar ID temporário
const generateTempId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};



export const financeiroService = {
  async list(filters: TransacaoFilters = {}): Promise<Transacao[]> {
    await assertRole(["admin"], "listar transações financeiras");
    try {
      const constraints: QueryConstraint[] = [];

      if (filters.colaboradorNome) {
        constraints.push(
          where("colaboradorNome", ">=", filters.colaboradorNome),
          where("colaboradorNome", "<=", filters.colaboradorNome + "\uf8ff")
        );
      }

      if (filters.tipoTransacao) {
        constraints.push(where("tipoTransacao", "==", filters.tipoTransacao));
      }

      if (filters.status) {
        constraints.push(where("status", "==", filters.status));
      }

      if (filters.categoria) {
        constraints.push(where("categoria", "==", filters.categoria));
      }

      if (filters.dataInicio) {
        constraints.push(
          where("dataVencimento", ">=", dateToTimestamp(filters.dataInicio))
        );
      }

      if (filters.dataFim) {
        constraints.push(
          where("dataVencimento", "<=", dateToTimestamp(filters.dataFim))
        );
      }

      constraints.push(orderBy("criadoEm", "desc"));

      const q = query(collection(db, COLLECTION_NAME), ...constraints);
      const querySnapshot = await getDocs(q);

      let transacoes = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          dataVencimento: timestampToDate(data.dataVencimento as Timestamp),
          dataPagamento: data.dataPagamento
            ? timestampToDate(data.dataPagamento as Timestamp)
            : undefined,
          aprovadoEm: data.aprovadoEm
            ? timestampToDate(data.aprovadoEm as Timestamp)
            : undefined,
          pagoEm: data.pagoEm
            ? timestampToDate(data.pagoEm as Timestamp)
            : undefined,
          criadoEm: timestampToDate(data.criadoEm as Timestamp),
          atualizadoEm: timestampToDate(data.atualizadoEm as Timestamp),
        } as Transacao;
      });

      // Se não houver dados no banco, usa lista local
      if (transacoes.length === 0) {
        let local = getLocalTransacoes();
        
        transacoes = local;
        // Aplicar todos os filtros na lista local
        if (filters.colaboradorNome) {
          const nomeLower = filters.colaboradorNome.toLowerCase();
          transacoes = transacoes.filter((t) =>
            t.colaboradorNome.toLowerCase().includes(nomeLower)
          );
        }
        if (filters.tipoTransacao) {
          transacoes = transacoes.filter((t) => t.tipoTransacao === filters.tipoTransacao);
        }
        if (filters.status) {
          transacoes = transacoes.filter((t) => t.status === filters.status);
        }
        if (filters.categoria) {
          transacoes = transacoes.filter((t) => t.categoria === filters.categoria);
        }
        if (filters.dataInicio) {
          transacoes = transacoes.filter((t) => t.dataVencimento >= filters.dataInicio!);
        }
        if (filters.dataFim) {
          transacoes = transacoes.filter((t) => t.dataVencimento <= filters.dataFim!);
        }
      }

      // Filtros adicionais que não podem ser aplicados no Firestore
      if (filters.valorMin !== undefined) {
        transacoes = transacoes.filter((t) => t.valor >= filters.valorMin!);
      }

      if (filters.valorMax !== undefined) {
        transacoes = transacoes.filter((t) => t.valor <= filters.valorMax!);
      }

      // Aplicar filtro de colaboradorNome também
      if (filters.colaboradorNome && transacoes.length > 0) {
        const nomeLower = filters.colaboradorNome.toLowerCase();
        transacoes = transacoes.filter((t) =>
          t.colaboradorNome.toLowerCase().includes(nomeLower)
        );
      }

      return transacoes;
    } catch (error) {
      console.error("Erro ao listar transações:", error);
      let local = getLocalTransacoes();
      

      if (filters.colaboradorNome) {
        const nomeLower = filters.colaboradorNome.toLowerCase();
        local = local.filter((t) =>
          t.colaboradorNome.toLowerCase().includes(nomeLower)
        );
      }
      if (filters.tipoTransacao) {
        local = local.filter((t) => t.tipoTransacao === filters.tipoTransacao);
      }
      if (filters.status) {
        local = local.filter((t) => t.status === filters.status);
      }
      if (filters.categoria) {
        local = local.filter((t) => t.categoria === filters.categoria);
      }
      if (filters.dataInicio) {
        local = local.filter((t) => t.dataVencimento >= filters.dataInicio!);
      }
      if (filters.dataFim) {
        local = local.filter((t) => t.dataVencimento <= filters.dataFim!);
      }
      if (filters.valorMin !== undefined) {
        local = local.filter((t) => t.valor >= filters.valorMin!);
      }
      if (filters.valorMax !== undefined) {
        local = local.filter((t) => t.valor <= filters.valorMax!);
      }
      return local;
    }
  },

  async create(
    formData: TransacaoFormData,
    criadoPor: string
  ): Promise<string> {
    await assertRole(["admin"], "criar transação financeira");
    validateRequiredString(formData.colaboradorId, "ID do colaborador", 1, 80);
    validateRequiredString(formData.colaboradorNome, "Nome do colaborador", 2, 120);
    validateRequiredString(formData.descricao, "Descrição", 3, 300);
    const valor = validatePositiveNumber(formData.valor, "Valor");
    const now = new Date();

    if (!isFirebaseConfigured()) {
      const id = generateLocalId();
      const nova: Transacao = {
        id,
        colaboradorId: formData.colaboradorId,
        colaboradorNome: formData.colaboradorNome,
        cpf: formData.cpf,
        cargo: formData.cargo,
        setor: formData.setor,
        tipoTransacao: formData.tipoTransacao,
        categoria: formData.categoria,
        valor,
        descricao: formData.descricao,
        dataVencimento: formData.dataVencimento,
        status: "Pendente",
        formaPagamento: formData.formaPagamento,
        observacoes: formData.observacoes || "",
        anexos: [],
        criadoPor,
        criadoEm: now,
        atualizadoEm: now,
      };
      const local = getLocalTransacoes();
      local.push(nova);
      saveLocalTransacoes(local);
      return id;
    }

    try {
      const novaTransacao = {
        colaboradorId: formData.colaboradorId,
        colaboradorNome: formData.colaboradorNome,
        cpf: formData.cpf,
        cargo: formData.cargo,
        setor: formData.setor,
        tipoTransacao: formData.tipoTransacao,
        categoria: formData.categoria,
        valor,
        descricao: formData.descricao,
        dataVencimento: dateToTimestamp(formData.dataVencimento),
        status: "Pendente" as StatusTransacao,
        formaPagamento: formData.formaPagamento,
        observacoes: formData.observacoes || "",
        anexos: [],
        criadoPor,
        criadoEm: Timestamp.now(),
        atualizadoEm: Timestamp.now(),
      };

      const docRef = await addDoc(
        collection(db, COLLECTION_NAME),
        novaTransacao
      );
      return docRef.id;
    } catch (error) {
      console.error("Erro ao criar transação:", error);
      const id = generateLocalId();
      const nova: Transacao = {
        id,
        colaboradorId: formData.colaboradorId,
        colaboradorNome: formData.colaboradorNome,
        cpf: formData.cpf,
        cargo: formData.cargo,
        setor: formData.setor,
        tipoTransacao: formData.tipoTransacao,
        categoria: formData.categoria,
        valor,
        descricao: formData.descricao,
        dataVencimento: formData.dataVencimento,
        status: "Pendente",
        formaPagamento: formData.formaPagamento,
        observacoes: formData.observacoes || "",
        anexos: [],
        criadoPor,
        criadoEm: now,
        atualizadoEm: now,
      };
      const local = getLocalTransacoes();
      local.push(nova);
      saveLocalTransacoes(local);
      return id;
    }
  },

  async update(
    id: string,
    formData: Partial<TransacaoFormData>
  ): Promise<void> {
    await assertRole(["admin"], "atualizar transação financeira");
    if (id.startsWith("local-")) {
      const local = getLocalTransacoes();
      const idx = local.findIndex((t) => t.id === id);
      if (idx === -1) return;
      const valor = formData.valor !== undefined
        ? (typeof formData.valor === "number" ? formData.valor : parseFloat(String(formData.valor)) || 0)
        : local[idx].valor;
      const currentTrans = local[idx];
      local[idx] = {
        ...currentTrans,
        ...formData,
        valor,
        dataVencimento: formData.dataVencimento ?? currentTrans.dataVencimento,
        atualizadoEm: new Date(),
        anexos: currentTrans.anexos,
      };
      saveLocalTransacoes(local);
      return;
    }

    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const valor = formData.valor !== undefined
        ? (typeof formData.valor === "number" ? formData.valor : parseFloat(String(formData.valor)) || 0)
        : undefined;
      const updateData: Record<string, unknown> = {
        ...formData,
        atualizadoEm: Timestamp.now(),
      };
      if (valor !== undefined) updateData.valor = valor;
      if (formData.dataVencimento) {
        updateData.dataVencimento = dateToTimestamp(formData.dataVencimento);
      }

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error("Erro ao atualizar transação:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    await assertRole(["admin"], "deletar transação financeira");
    if (id.startsWith("local-")) {
      const local = getLocalTransacoes().filter((t) => t.id !== id);
      saveLocalTransacoes(local);
      return;
    }

    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
      console.error("Erro ao deletar transação:", error);
      throw error;
    }
  },

  async updateStatus(
    id: string,
    status: StatusTransacao,
    userId: string,
    formaPagamento?: FormaPagamento,
    numeroComprovante?: string,
    observacoes?: string
  ): Promise<void> {
    await assertRole(["admin"], "atualizar status financeiro");
    if (id.startsWith("local-")) {
      const local = getLocalTransacoes();
      const idx = local.findIndex((t) => t.id === id);
      if (idx === -1) return;
      const now = new Date();
      local[idx] = {
        ...local[idx],
        status,
        atualizadoEm: now,
        ...(status === "Aprovado" && { aprovadoPor: userId, aprovadoEm: now }),
        ...(status === "Pago" && {
          pagoPor: userId,
          pagoEm: now,
          dataPagamento: now,
          ...(formaPagamento && { formaPagamento }),
          ...(numeroComprovante && { numeroComprovante }),
        }),
        ...(observacoes && { observacoes }),
      };
      saveLocalTransacoes(local);
      return;
    }

    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const updateData: Record<string, unknown> = {
        status,
        atualizadoEm: Timestamp.now(),
      };

      if (status === "Aprovado") {
        updateData.aprovadoPor = userId;
        updateData.aprovadoEm = Timestamp.now();
      }

      if (status === "Pago") {
        updateData.pagoPor = userId;
        updateData.pagoEm = Timestamp.now();
        updateData.dataPagamento = Timestamp.now();
        if (formaPagamento) updateData.formaPagamento = formaPagamento;
        if (numeroComprovante) updateData.numeroComprovante = numeroComprovante;
      }

      if (observacoes) {
        updateData.observacoes = observacoes;
      }

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      throw error;
    }
  },

  async getStats(): Promise<FinanceiroStats> {
    await assertRole(["admin"], "consultar estatísticas financeiras");
    try {
      const transacoes = await this.list();

      const stats: FinanceiroStats = {
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
      };

      const mesAtual = new Date().getMonth();
      const anoAtual = new Date().getFullYear();

      transacoes.forEach((t) => {
        // Contagem por status
        if (t.status === "Pendente") {
          stats.totalPendente++;
          stats.valorTotalPendente += t.valor;
          if (t.tipoTransacao === "Adiantamento") {
            stats.adiantamentosPendentes++;
          }
          if (t.tipoTransacao === "Pagamento") {
            stats.pagamentosPendentes++;
          }
        }
        if (t.status === "Aprovado") {
          stats.totalAprovado++;
          stats.valorTotalAprovado += t.valor;
        }
        if (t.status === "Pago") {
          stats.totalPago++;
          stats.valorTotalPago += t.valor;
        }
        if (t.status === "Rejeitado") {
          stats.totalRejeitado++;
        }

        // Total do mês atual
        if (
          t.criadoEm.getMonth() === mesAtual &&
          t.criadoEm.getFullYear() === anoAtual
        ) {
          stats.valorTotalMes += t.valor;
        }
      });

      return stats;
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
      throw error;
    }
  },

  async getResumoMensal(mes: number, ano: number): Promise<ResumoFinanceiro> {
    await assertRole(["admin"], "consultar resumo financeiro");
    try {
      const dataInicio = new Date(ano, mes - 1, 1);
      const dataFim = new Date(ano, mes, 0);

      const transacoes = await this.list({
        dataInicio,
        dataFim,
      });

      const resumo: ResumoFinanceiro = {
        mes,
        ano,
        totalAdiantamentos: 0,
        totalPagamentos: 0,
        totalReembolsos: 0,
        totalDescontos: 0,
        valorTotalAdiantamentos: 0,
        valorTotalPagamentos: 0,
        valorTotalReembolsos: 0,
        valorTotalDescontos: 0,
        transacoesPorStatus: {
          pendente: 0,
          aprovado: 0,
          pago: 0,
          rejeitado: 0,
        },
        transacoesPorCategoria: [],
      };

      const categoriaMap = new Map<
        string,
        { quantidade: number; valor: number }
      >();

      transacoes.forEach((t) => {
        // Contagem por tipo
        switch (t.tipoTransacao) {
          case "Adiantamento":
            resumo.totalAdiantamentos++;
            resumo.valorTotalAdiantamentos += t.valor;
            break;
          case "Pagamento":
            resumo.totalPagamentos++;
            resumo.valorTotalPagamentos += t.valor;
            break;
          case "Reembolso":
            resumo.totalReembolsos++;
            resumo.valorTotalReembolsos += t.valor;
            break;
          case "Desconto":
            resumo.totalDescontos++;
            resumo.valorTotalDescontos += t.valor;
            break;
        }

        // Contagem por status
        switch (t.status) {
          case "Pendente":
            resumo.transacoesPorStatus.pendente++;
            break;
          case "Aprovado":
            resumo.transacoesPorStatus.aprovado++;
            break;
          case "Pago":
            resumo.transacoesPorStatus.pago++;
            break;
          case "Rejeitado":
            resumo.transacoesPorStatus.rejeitado++;
            break;
        }

        // Agrupamento por categoria
        const catData = categoriaMap.get(t.categoria) || {
          quantidade: 0,
          valor: 0,
        };
        catData.quantidade++;
        catData.valor += t.valor;
        categoriaMap.set(t.categoria, catData);
      });

      // Converter map para array
      resumo.transacoesPorCategoria = Array.from(categoriaMap.entries()).map(
        ([categoria, data]) => ({
          categoria: categoria as CategoriaFinanceira,
          quantidade: data.quantidade,
          valor: data.valor,
        })
      );

      return resumo;
    } catch (error) {
      console.error("Erro ao gerar resumo mensal:", error);
      throw error;
    }
  },

  async exportarRelatorioCSV(filters: TransacaoFilters = {}): Promise<string> {
    try {
      const transacoes = await this.list(filters);

      const headers = [
        "Data",
        "Colaborador",
        "CPF",
        "Tipo",
        "Categoria",
        "Valor",
        "Status",
        "Vencimento",
        "Pagamento",
        "Forma Pagamento",
        "Descrição",
      ];

      const rows = transacoes.map((t) => [
        new Intl.DateTimeFormat("pt-BR").format(t.criadoEm),
        t.colaboradorNome,
        t.cpf,
        t.tipoTransacao,
        t.categoria,
        t.valor.toFixed(2),
        t.status,
        new Intl.DateTimeFormat("pt-BR").format(t.dataVencimento),
        t.dataPagamento
          ? new Intl.DateTimeFormat("pt-BR").format(t.dataPagamento)
          : "-",
        t.formaPagamento || "-",
        t.descricao,
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      const blob = new Blob(["\ufeff" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);

      return url;
    } catch (error) {
      console.error("Erro ao exportar relatório:", error);
      throw error;
    }
  },
};
