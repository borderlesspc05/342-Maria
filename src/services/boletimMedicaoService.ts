import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
  Timestamp,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "../lib/firebaseconfig";
import type {
  BoletimMedicao,
  BoletimMedicaoFormData,
  BoletimFilters,
  BoletimStats,
  Anexo,
} from "../types/boletimMedicao";
import { uploadAnexos, removeAnexo } from "./anexoService";
import {
  getDataScope,
  validateRequiredString,
} from "./securityService";

const BOLETINS_COLLECTION = "boletinsMedicao";

function mapAnexoFromFirestore(raw: Record<string, unknown>): Anexo {
  return {
    id: (raw.id as string) || "",
    nome: (raw.nome as string) || "",
    tipo: (raw.tipo as string) || "",
    url: (raw.url as string) || "",
    tamanho: (raw.tamanho as number) || 0,
    dataUpload:
      raw.dataUpload instanceof Timestamp
        ? raw.dataUpload.toDate()
        : raw.dataUpload
          ? new Date(raw.dataUpload as string)
          : new Date(),
    storagePath: raw.storagePath as string | undefined,
  };
}

/**
 * Converte um documento do Firestore para BoletimMedicao
 */
function convertToBoletim(doc: any): BoletimMedicao {
  const data = doc.data();
  const rawAnexos = (data.anexos as Record<string, unknown>[]) || [];
  return {
    id: doc.id,
    numero: data.numero || "",
    cliente: data.cliente || "",
    mesReferencia: data.mesReferencia || "",
    anoReferencia: data.anoReferencia || new Date().getFullYear(),
    tipoServico: data.tipoServico || "Outro",
    status: data.status || "Pendente",
    valor: data.valor || 0,
    dataEmissao: data.dataEmissao?.toDate?.() || new Date(data.dataEmissao || Date.now()),
    dataVencimento: data.dataVencimento?.toDate?.() || new Date(data.dataVencimento || Date.now()),
    observacoes: data.observacoes || "",
    anexos: rawAnexos.map(mapAnexoFromFirestore),
    criadoPor: data.criadoPor || "unknown",
    criadoEm: data.criadoEm?.toDate?.() || new Date(data.criadoEm || Date.now()),
    atualizadoEm: data.atualizadoEm?.toDate?.() || new Date(data.atualizadoEm || Date.now()),
  };
}

// Mock data para fallback local (quando Firebase não está disponível)
const mockBoletins: BoletimMedicao[] = [
  {
    id: "1",
    numero: "BM-2024-001",
    cliente: "Construtora ABC Ltda",
    mesReferencia: "Outubro",
    anoReferencia: 2024,
    tipoServico: "Instalação",
    status: "Emitido",
    valor: 45000.0,
    dataEmissao: new Date("2024-10-15"),
    dataVencimento: new Date("2024-11-15"),
    observacoes: "Instalação completa do sistema elétrico",
    anexos: [],
    criadoPor: "user1",
    criadoEm: new Date("2024-10-15"),
    atualizadoEm: new Date("2024-10-15"),
  },
  {
    id: "2",
    numero: "BM-2024-002",
    cliente: "Empresa XYZ S.A.",
    mesReferencia: "Outubro",
    anoReferencia: 2024,
    tipoServico: "Manutenção",
    status: "Pendente",
    valor: 12500.0,
    dataEmissao: new Date("2024-10-20"),
    dataVencimento: new Date("2024-11-20"),
    observacoes: "Manutenção preventiva mensal",
    anexos: [],
    criadoPor: "user1",
    criadoEm: new Date("2024-10-20"),
    atualizadoEm: new Date("2024-10-20"),
  },
  {
    id: "3",
    numero: "BM-2024-003",
    cliente: "Construtora ABC Ltda",
    mesReferencia: "Setembro",
    anoReferencia: 2024,
    tipoServico: "Vistoria",
    status: "Aguardando assinatura",
    valor: 8500.0,
    dataEmissao: new Date("2024-09-28"),
    dataVencimento: new Date("2024-10-28"),
    observacoes: "Vistoria técnica completa",
    anexos: [],
    criadoPor: "user1",
    criadoEm: new Date("2024-09-28"),
    atualizadoEm: new Date("2024-09-28"),
  },
  {
    id: "4",
    numero: "BM-2024-004",
    cliente: "Construtora DEF",
    mesReferencia: "Outubro",
    anoReferencia: 2024,
    tipoServico: "Instalação",
    status: "Emitido",
    valor: 32000.0,
    dataEmissao: new Date("2024-10-10"),
    dataVencimento: new Date("2024-11-10"),
    observacoes: "",
    anexos: [],
    criadoPor: "user1",
    criadoEm: new Date("2024-10-10"),
    atualizadoEm: new Date("2024-10-10"),
  },
  {
    id: "5",
    numero: "BM-2024-005",
    cliente: "Empresa XYZ S.A.",
    mesReferencia: "Outubro",
    anoReferencia: 2024,
    tipoServico: "Manutenção",
    status: "Aguardando assinatura",
    valor: 15000.0,
    dataEmissao: new Date("2024-10-25"),
    dataVencimento: new Date("2024-11-25"),
    observacoes: "Manutenção corretiva",
    anexos: [],
    criadoPor: "user1",
    criadoEm: new Date("2024-10-25"),
    atualizadoEm: new Date("2024-10-25"),
  },
];

export const boletimMedicaoService = {
  async getAll(filters?: BoletimFilters): Promise<BoletimMedicao[]> {
    const scope = await getDataScope(["admin", "gestor"], "listar boletins de medição");
    try {
      // Construir query com filtros
      const constraints: QueryConstraint[] = [];

      if (!scope.isPrivileged) {
        constraints.push(where("ownerUid", "==", scope.uid));
      }

      if (filters) {
        if (filters.mes) {
          constraints.push(where("mesReferencia", "==", filters.mes));
        }
        if (filters.ano) {
          constraints.push(where("anoReferencia", "==", filters.ano));
        }
        if (filters.tipoServico) {
          constraints.push(where("tipoServico", "==", filters.tipoServico));
        }
        if (filters.status) {
          constraints.push(where("status", "==", filters.status));
        }
      }

      // Ordenar por data de criação (mais recentes primeiro)
      constraints.push(orderBy("criadoEm", "desc"));

      const q = query(collection(db, BOLETINS_COLLECTION), ...constraints);
      const querySnapshot = await getDocs(q);

      let boletins = querySnapshot.docs.map(convertToBoletim);

      // Filtro de cliente (aplicado localmente por causa de limitações do Firestore)
      if (filters?.cliente) {
        boletins = boletins.filter((b) =>
          b.cliente.toLowerCase().includes(filters.cliente!.toLowerCase())
        );
      }

      return boletins;
    } catch (error) {
      console.error("Erro ao buscar boletins no Firebase, usando fallback:", error);
      
      // Fallback: usar mock ou aplicar filtros localmente
      let filtered = [...mockBoletins];
      if (filters) {
        if (filters.mes) {
          filtered = filtered.filter((b) => b.mesReferencia === filters.mes);
        }
        if (filters.ano) {
          filtered = filtered.filter((b) => b.anoReferencia === filters.ano);
        }
        if (filters.cliente) {
          filtered = filtered.filter((b) =>
            b.cliente.toLowerCase().includes(filters.cliente!.toLowerCase())
          );
        }
        if (filters.tipoServico) {
          filtered = filtered.filter((b) => b.tipoServico === filters.tipoServico);
        }
        if (filters.status) {
          filtered = filtered.filter((b) => b.status === filters.status);
        }
      }
      return filtered.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
    }
  },

  async getById(id: string): Promise<BoletimMedicao | null> {
    const scope = await getDataScope(["admin", "gestor"], "consultar boletim de medição");
    try {
      const docRef = doc(db, BOLETINS_COLLECTION, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const ownerUid = docSnap.data()?.ownerUid as string | undefined;
        if (!scope.isPrivileged && ownerUid !== scope.uid) {
          return null;
        }
        return convertToBoletim(docSnap);
      }
      return null;
    } catch (error) {
      console.error("Erro ao buscar boletim por ID, usando fallback:", error);
      return mockBoletins.find((b) => b.id === id) || null;
    }
  },

  async create(data: BoletimMedicaoFormData): Promise<BoletimMedicao> {
    const scope = await getDataScope(["admin", "gestor"], "criar boletim de medição");
    validateRequiredString(data.cliente, "Cliente", 2, 120);
    try {
      // Gerar número do boletim
      const allBoletins = await this.getAll({ ano: data.anoReferencia });
      const numero = `BM-${data.anoReferencia}-${String(allBoletins.length + 1).padStart(3, "0")}`;

      const now = new Date();
      const docData = {
        numero,
        cliente: data.cliente,
        mesReferencia: data.mesReferencia,
        anoReferencia: data.anoReferencia,
        tipoServico: data.tipoServico,
        status: data.status || "Pendente",
        valor: data.valor,
        dataEmissao: data.dataEmissao ? Timestamp.fromDate(data.dataEmissao) : Timestamp.fromDate(now),
        dataVencimento: data.dataVencimento ? Timestamp.fromDate(data.dataVencimento) : Timestamp.fromDate(now),
        observacoes: data.observacoes || "",
        anexos: [],
        ownerUid: scope.uid,
        criadoPor: scope.uid,
        criadoEm: Timestamp.fromDate(now),
        atualizadoEm: Timestamp.fromDate(now),
      };

      const docRef = await addDoc(collection(db, BOLETINS_COLLECTION), docData);
      const docSnap = await getDoc(docRef);
      
      return convertToBoletim(docSnap);
    } catch (error) {
      console.error("Erro ao criar boletim no Firebase:", error);
      throw new Error("Falha ao criar boletim de medição. Verifique sua conexão.");
    }
  },

  async update(
    id: string,
    data: Partial<BoletimMedicaoFormData>
  ): Promise<BoletimMedicao> {
    await getDataScope(["admin", "gestor"], "atualizar boletim de medição");
    try {
      const existing = await this.getById(id);
      if (!existing) {
        throw new Error("Boletim não encontrado.");
      }

      const docRef = doc(db, BOLETINS_COLLECTION, id);
      
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { anexos, ...updateData } = data;
      
      const updatePayload: any = {
        ...updateData,
        atualizadoEm: Timestamp.fromDate(new Date()),
      };

      // Converter datas para Timestamp se presentes
      if (updateData.dataEmissao) {
        updatePayload.dataEmissao = Timestamp.fromDate(updateData.dataEmissao);
      }
      if (updateData.dataVencimento) {
        updatePayload.dataVencimento = Timestamp.fromDate(updateData.dataVencimento);
      }

      await updateDoc(docRef, updatePayload);
      
      const updatedDoc = await getDoc(docRef);
      if (!updatedDoc.exists()) {
        throw new Error("Boletim não encontrado após atualização");
      }
      
      return convertToBoletim(updatedDoc);
    } catch (error) {
      console.error("Erro ao atualizar boletim no Firebase:", error);
      throw new Error("Falha ao atualizar boletim de medição.");
    }
  },

  async delete(id: string): Promise<void> {
    await getDataScope(["admin", "gestor"], "deletar boletim de medição");
    try {
      const existing = await this.getById(id);
      if (!existing) {
        throw new Error("Boletim não encontrado.");
      }

      const docRef = doc(db, BOLETINS_COLLECTION, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Erro ao deletar boletim no Firebase:", error);
      throw new Error("Falha ao excluir boletim de medição.");
    }
  },

  async getStats(ano?: number, mes?: string): Promise<BoletimStats> {
    await getDataScope(["admin", "gestor"], "consultar estatísticas de boletins");
    try {
      // Buscar boletins com filtros
      const filters: BoletimFilters = {};
      if (ano) filters.ano = ano;
      if (mes) filters.mes = mes;

      const boletins = await this.getAll(filters);

      const totalEmitidoMes = boletins
        .filter((b) => b.status === "Emitido")
        .reduce((sum, b) => sum + b.valor, 0);

      const saldoPendente = boletins
        .filter(
          (b) => b.status === "Pendente" || b.status === "Aguardando assinatura"
        )
        .reduce((sum, b) => sum + b.valor, 0);

      const aguardandoAssinatura = boletins.filter(
        (b) => b.status === "Aguardando assinatura"
      ).length;

      return {
        totalEmitidoMes,
        saldoPendente,
        totalBoletins: boletins.length,
        aguardandoAssinatura,
      };
    } catch (error) {
      console.error("Erro ao buscar estatísticas de boletins:", error);
      
      // Fallback local
      let filtered = [...mockBoletins];
      if (ano) {
        filtered = filtered.filter((b) => b.anoReferencia === ano);
      }
      if (mes) {
        filtered = filtered.filter((b) => b.mesReferencia === mes);
      }

      const totalEmitidoMes = filtered
        .filter((b) => b.status === "Emitido")
        .reduce((sum, b) => sum + b.valor, 0);

      const saldoPendente = filtered
        .filter(
          (b) => b.status === "Pendente" || b.status === "Aguardando assinatura"
        )
        .reduce((sum, b) => sum + b.valor, 0);

      const aguardandoAssinatura = filtered.filter(
        (b) => b.status === "Aguardando assinatura"
      ).length;

      return {
        totalEmitidoMes,
        saldoPendente,
        totalBoletins: filtered.length,
        aguardandoAssinatura,
      };
    }
  },

  /**
   * Adiciona anexos a um boletim
   */
  async addAnexos(boletimId: string, files: File[]): Promise<Anexo[]> {
    await getDataScope(["admin", "gestor"], "adicionar anexos no boletim");
    try {
      // Upload dos arquivos
      const novosAnexos = await uploadAnexos(files);

      // Buscar boletim atual
      const boletim = await this.getById(boletimId);
      if (!boletim) {
        throw new Error("Boletim não encontrado");
      }

      // Atualizar boletim com novos anexos
      const anexosAtualizados = [...boletim.anexos, ...novosAnexos];
      
      const docRef = doc(db, BOLETINS_COLLECTION, boletimId);
      await updateDoc(docRef, {
        anexos: anexosAtualizados,
        atualizadoEm: Timestamp.fromDate(new Date()),
      });

      return novosAnexos;
    } catch (error) {
      console.error("Erro ao adicionar anexos:", error);
      throw new Error("Falha ao adicionar anexos ao boletim");
    }
  },

  /**
   * Remove um anexo de um boletim (Firestore + Firebase Storage quando houver storagePath)
   */
  async removeAnexo(boletimId: string, anexoId: string): Promise<void> {
    await getDataScope(["admin", "gestor"], "remover anexo do boletim");
    try {
      const boletim = await this.getById(boletimId);
      if (!boletim) {
        throw new Error("Boletim não encontrado");
      }

      const anexoRemovido = boletim.anexos.find((a) => a.id === anexoId);
      if (anexoRemovido) {
        await removeAnexo(anexoRemovido);
      }

      const anexosAtualizados = boletim.anexos.filter((a) => a.id !== anexoId);

      const docRef = doc(db, BOLETINS_COLLECTION, boletimId);
      await updateDoc(docRef, {
        anexos: anexosAtualizados.map((a) => ({
          ...a,
          dataUpload: a.dataUpload instanceof Date ? Timestamp.fromDate(a.dataUpload) : a.dataUpload,
        })),
        atualizadoEm: Timestamp.fromDate(new Date()),
      });
    } catch (error) {
      console.error("Erro ao remover anexo:", error);
      throw new Error("Falha ao remover anexo");
    }
  },
};
