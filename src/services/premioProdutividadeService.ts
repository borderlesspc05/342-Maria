import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
  Timestamp,
  type QueryConstraint,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "../lib/firebaseconfig";
import type {
  PremioProdutividade,
  PremioFormData,
  PremioFilters,
  PremioStats,
  RelatorioMensal,
  PremioStatus,
} from "../types/premioProdutividade";
import { getDataScope } from "./securityService";

const premiosCollection = collection(db, "premiosProdutividade");

const mapSnapshotToPremio = (
  snapshot: QueryDocumentSnapshot<DocumentData>
): PremioProdutividade => {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    colaboradorId: data.colaboradorId,
    colaboradorNome: data.colaboradorNome,
    cpf: data.cpf,
    cargo: data.cargo,
    setor: data.setor,
    valor: data.valor,
    dataPremio: data.dataPremio
      ? data.dataPremio.toDate()
      : new Date(data.criadoEm?.toDate?.() ?? Date.now()),
    motivo: data.motivo,
    status: data.status as PremioStatus,
    mesReferencia: data.mesReferencia,
    anoReferencia: data.anoReferencia,
    criadoEm: data.criadoEm ? data.criadoEm.toDate() : new Date(),
    atualizadoEm: data.atualizadoEm ? data.atualizadoEm.toDate() : new Date(),
    aprovadoPor: data.aprovadoPor,
    observacoes: data.observacoes,
  };
};

const buildFiltersQuery = (filters?: PremioFilters, ownerUid?: string) => {
  const constraints: QueryConstraint[] = [];

  if (ownerUid) {
    constraints.push(where("ownerUid", "==", ownerUid));
  }

  // Aplica filtros na ordem correta para evitar problemas de índice
  if (filters?.ano) {
    constraints.push(where("anoReferencia", "==", filters.ano));
  }

  if (filters?.mes) {
    constraints.push(where("mesReferencia", "==", filters.mes));
  }

  if (filters?.status) {
    constraints.push(where("status", "==", filters.status));
  }

  if (filters?.colaboradorNome) {
    constraints.push(
      where(
        "colaboradorNomeSearch",
        "array-contains",
        filters.colaboradorNome.toLowerCase()
      )
    );
  }

  // OrderBy sempre por último
  constraints.push(orderBy("dataPremio", "desc"));

  return query(premiosCollection, ...constraints);
};

export const premioProdutividadeService = {
  async list(filters?: PremioFilters): Promise<PremioProdutividade[]> {
    const scope = await getDataScope(
      ["admin", "gestor"],
      "listar prêmios de produtividade"
    );

    try {
      const q = buildFiltersQuery(filters, scope.isPrivileged ? undefined : scope.uid);
      const snapshot = await getDocs(q);
      return snapshot.docs.map(mapSnapshotToPremio);
    } catch (error: any) {
      // Se houver erro de índice faltando, tenta query mais simples
      if (error?.code === "failed-precondition" || error?.message?.includes("index")) {
        console.warn("Índice composto não encontrado, usando query simplificada:", error);
        
        // Tenta query sem orderBy primeiro
        try {
          const simpleConstraints: QueryConstraint[] = [];
          if (!scope.isPrivileged) {
            simpleConstraints.push(where("ownerUid", "==", scope.uid));
          }
          if (filters?.ano) {
            simpleConstraints.push(where("anoReferencia", "==", filters.ano));
          }
          if (filters?.mes) {
            simpleConstraints.push(where("mesReferencia", "==", filters.mes));
          }
          
          const simpleQuery = query(premiosCollection, ...simpleConstraints);
          const snapshot = await getDocs(simpleQuery);
          let results = snapshot.docs.map(mapSnapshotToPremio);
          
          // Aplica filtros restantes em memória
          if (filters?.status) {
            results = results.filter((p) => p.status === filters.status);
          }
          if (filters?.colaboradorNome) {
            const searchTerm = filters.colaboradorNome.toLowerCase();
            results = results.filter((p) =>
              p.colaboradorNome.toLowerCase().includes(searchTerm)
            );
          }
          
          // Ordena em memória
          results.sort((a, b) => b.dataPremio.getTime() - a.dataPremio.getTime());
          
          return results;
        } catch (fallbackError) {
          console.error("Erro na query simplificada:", fallbackError);
          // Se ainda falhar, retorna lista vazia ou tenta sem filtros
          if (filters && (filters.ano || filters.mes || filters.status || filters.colaboradorNome)) {
            // Última tentativa: sem filtros
            const snapshot = await getDocs(query(premiosCollection, orderBy("dataPremio", "desc")));
            let results = snapshot.docs.map(mapSnapshotToPremio);
            
            // Aplica todos os filtros em memória
            if (filters.ano) {
              results = results.filter((p) => p.anoReferencia === filters.ano);
            }
            if (filters.mes) {
              results = results.filter((p) => p.mesReferencia === filters.mes);
            }
            if (filters.status) {
              results = results.filter((p) => p.status === filters.status);
            }
            if (filters.colaboradorNome) {
              const searchTerm = filters.colaboradorNome.toLowerCase();
              results = results.filter((p) =>
                p.colaboradorNome.toLowerCase().includes(searchTerm)
              );
            }
            
            return results;
          }
          throw fallbackError;
        }
      }
      throw error;
    }
  },

  async create(data: PremioFormData): Promise<string> {
    const scope = await getDataScope(
      ["admin", "gestor"],
      "criar prêmio de produtividade"
    );

    try {
      const payload = {
        ...data,
        ownerUid: scope.uid,
        valor: Number(data.valor),
        mesReferencia: data.dataPremio.getMonth() + 1,
        anoReferencia: data.dataPremio.getFullYear(),
        dataPremio: Timestamp.fromDate(data.dataPremio),
        status: data.status || "Pendente",
        colaboradorNomeSearch: data.colaboradorNome
          .toLowerCase()
          .split(" ")
          .filter(Boolean),
        criadoEm: Timestamp.now(),
        atualizadoEm: Timestamp.now(),
      };

      const docRef = await addDoc(premiosCollection, payload);
      return docRef.id;
    } catch (error: any) {
      console.error("Erro ao criar prêmio:", error);
      if (error?.code === "permission-denied") {
        throw new Error(
          "Permissão negada. Verifique as regras de segurança do Firestore."
        );
      }
      throw new Error(
        error?.message || "Não foi possível criar o prêmio de produtividade."
      );
    }
  },

  async update(id: string, data: Partial<PremioFormData>): Promise<void> {
    await getDataScope(["admin", "gestor"], "atualizar prêmio de produtividade");
    const docRef = doc(premiosCollection, id);
    const payload: Record<string, unknown> = {
      ...data,
      atualizadoEm: Timestamp.now(),
    };

    if (data.dataPremio) {
      payload.dataPremio = Timestamp.fromDate(data.dataPremio);
      payload.mesReferencia = data.dataPremio.getMonth() + 1;
      payload.anoReferencia = data.dataPremio.getFullYear();
    }

    if (data.colaboradorNome) {
      payload.colaboradorNomeSearch = data.colaboradorNome
        .toLowerCase()
        .split(" ")
        .filter(Boolean);
    }

    await updateDoc(docRef, payload);
  },

  async updateStatus(
    id: string,
    status: PremioStatus,
    aprovadoPor?: string
  ): Promise<void> {
    await getDataScope(["admin", "gestor"], "atualizar status de prêmio");
    const docRef = doc(premiosCollection, id);
    await updateDoc(docRef, {
      status,
      aprovadoPor: aprovadoPor || null,
      atualizadoEm: Timestamp.now(),
    });
  },

  async delete(id: string): Promise<void> {
    await getDataScope(["admin", "gestor"], "deletar prêmio de produtividade");
    const docRef = doc(premiosCollection, id);
    await deleteDoc(docRef);
  },

  async getHistoricoByColaborador(
    colaboradorId: string
  ): Promise<PremioProdutividade[]> {
    const scope = await getDataScope(
      ["admin", "gestor"],
      "consultar histórico de prêmios"
    );
    const q = query(
      premiosCollection,
      ...(scope.isPrivileged ? [] : [where("ownerUid", "==", scope.uid)]),
      where("colaboradorId", "==", colaboradorId),
      orderBy("dataPremio", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(mapSnapshotToPremio);
  },

  async getStats(ano: number, mes: number): Promise<PremioStats> {
    const scope = await getDataScope(
      ["admin", "gestor"],
      "consultar estatísticas de prêmios"
    );
    try {
      const q = query(
        premiosCollection,
        ...(scope.isPrivileged ? [] : [where("ownerUid", "==", scope.uid)]),
        where("anoReferencia", "==", ano),
        where("mesReferencia", "==", mes)
      );
      const snapshot = await getDocs(q);
      const entries = snapshot.docs.map(mapSnapshotToPremio);

      const totalPremiado = entries.reduce(
        (sum, premio) => sum + premio.valor,
        0
      );
      const pendente = entries
        .filter((p) => p.status === "Pendente")
        .reduce((sum, premio) => sum + premio.valor, 0);
      const emRevisao = entries
        .filter((p) => p.status === "Em revisão")
        .reduce((sum, premio) => sum + premio.valor, 0);
      const aprovados = entries
        .filter((p) => p.status === "Aprovado")
        .reduce((sum, premio) => sum + premio.valor, 0);

      return {
        totalPremiado,
        pendente,
        emRevisao,
        aprovados,
      };
    } catch (error: any) {
      // Se houver erro de índice, busca todos e filtra em memória
      if (error?.code === "failed-precondition" || error?.message?.includes("index")) {
        console.warn("Índice não encontrado para stats, usando fallback");
        const snapshot = await getDocs(
          query(
            premiosCollection,
            ...(scope.isPrivileged ? [] : [where("ownerUid", "==", scope.uid)])
          )
        );
        const allEntries = snapshot.docs.map(mapSnapshotToPremio);
        const entries = allEntries.filter(
          (p) => p.anoReferencia === ano && p.mesReferencia === mes
        );

        const totalPremiado = entries.reduce(
          (sum, premio) => sum + premio.valor,
          0
        );
        const pendente = entries
          .filter((p) => p.status === "Pendente")
          .reduce((sum, premio) => sum + premio.valor, 0);
        const emRevisao = entries
          .filter((p) => p.status === "Em revisão")
          .reduce((sum, premio) => sum + premio.valor, 0);
        const aprovados = entries
          .filter((p) => p.status === "Aprovado")
          .reduce((sum, premio) => sum + premio.valor, 0);

        return {
          totalPremiado,
          pendente,
          emRevisao,
          aprovados,
        };
      }
      console.error("Erro ao carregar estatísticas:", error);
      return {
        totalPremiado: 0,
        pendente: 0,
        emRevisao: 0,
        aprovados: 0,
      };
    }
  },

  async gerarRelatorioMensal(
    ano: number,
    mes: number
  ): Promise<RelatorioMensal> {
    const scope = await getDataScope(
      ["admin", "gestor"],
      "gerar relatório mensal de prêmios"
    );
    const q = query(
      premiosCollection,
      ...(scope.isPrivileged ? [] : [where("ownerUid", "==", scope.uid)]),
      where("anoReferencia", "==", ano),
      where("mesReferencia", "==", mes)
    );
    const snapshot = await getDocs(q);
    const entries = snapshot.docs.map(mapSnapshotToPremio);

    const totalPago = entries
      .filter((p) => p.status === "Aprovado")
      .reduce((sum, premio) => sum + premio.valor, 0);
    const totalPendente = entries
      .filter((p) => p.status === "Pendente")
      .reduce((sum, premio) => sum + premio.valor, 0);
    const totalEmRevisao = entries
      .filter((p) => p.status === "Em revisão")
      .reduce((sum, premio) => sum + premio.valor, 0);

    return {
      mes,
      ano,
      totalRegistros: entries.length,
      totalPago,
      totalPendente,
      totalEmRevisao,
    };
  },

  async exportarRelatorioCSV(ano: number, mes: number): Promise<Blob> {
    const scope = await getDataScope(
      ["admin", "gestor"],
      "exportar relatório de prêmios"
    );
    const q = query(
      premiosCollection,
      ...(scope.isPrivileged ? [] : [where("ownerUid", "==", scope.uid)]),
      where("anoReferencia", "==", ano),
      where("mesReferencia", "==", mes),
      orderBy("dataPremio", "desc")
    );
    const snapshot = await getDocs(q);
    const entries = snapshot.docs.map(mapSnapshotToPremio);

    const header = [
      "Colaborador",
      "CPF",
      "Cargo",
      "Setor",
      "Valor",
      "Data",
      "Motivo",
      "Status",
    ];

    const rows = entries.map((entry) => [
      entry.colaboradorNome,
      entry.cpf,
      entry.cargo,
      entry.setor,
      entry.valor.toFixed(2).replace(".", ","),
      entry.dataPremio.toLocaleDateString("pt-BR"),
      entry.motivo.replace(/(\r\n|\n|\r)/gm, " "),
      entry.status,
    ]);

    const csvContent = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")
      )
      .join("\n");

    return new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  },
};
