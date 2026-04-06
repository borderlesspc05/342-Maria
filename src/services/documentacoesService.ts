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
  type QueryConstraint,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { auth, db } from "../lib/firebaseconfig";
import type {
  Documento,
  DocumentoFormData,
  DocumentoFilters,
  DocumentoStats,
  StatusDocumento,
  TipoDocumento,
  Treinamento,
  TreinamentoFormData,
} from "../types/documentacoes";
import { assertRole, validateRequiredString } from "./securityService";

const documentosCollection = collection(db, "documentacoes");
const treinamentosCollection = collection(db, "treinamentos");
const LOCAL_DOCS_KEY = "documentacoes_documentos_local";
const CREATE_TIMEOUT_MS = 15000;
const LIST_TIMEOUT_MS = 10000;

function isFirebaseConfigured(): boolean {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  return typeof projectId === "string" && projectId.trim().length > 0;
}

function getScopedLocalKey(): string {
  const uid = auth.currentUser?.uid ?? "anon";
  return `${LOCAL_DOCS_KEY}:${uid}`;
}

function timeoutPromise<T>(ms: number, message: string): Promise<T> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(message)), ms)
  );
}

function getLocalDocumentos(): Documento[] {
  try {
    const raw = localStorage.getItem(getScopedLocalKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    return parsed.map((d) => ({
      ...d,
      dataEmissao: d.dataEmissao ? new Date(d.dataEmissao as string) : undefined,
      dataValidade: d.dataValidade ? new Date(d.dataValidade as string) : new Date(),
      dataAlerta: d.dataAlerta ? new Date(d.dataAlerta as string) : undefined,
      criadoEm: d.criadoEm ? new Date(d.criadoEm as string) : new Date(),
      atualizadoEm: d.atualizadoEm ? new Date(d.atualizadoEm as string) : new Date(),
      anexos: (d.anexos as Documento["anexos"]) || [],
    })) as Documento[];
  } catch {
    return [];
  }
}

function saveLocalDocumento(doc: Documento): void {
  const list = getLocalDocumentos();
  const idx = list.findIndex((d) => d.id === doc.id);
  const serialized = (idx >= 0 ? list.map((d, i) => (i === idx ? doc : d)) : [...list, doc]).map(
    (d) => ({
      ...d,
      dataEmissao: d.dataEmissao?.toISOString?.() ?? null,
      dataValidade: d.dataValidade?.toISOString?.() ?? null,
      dataAlerta: d.dataAlerta?.toISOString?.() ?? null,
      criadoEm: d.criadoEm?.toISOString?.() ?? null,
      atualizadoEm: d.atualizadoEm?.toISOString?.() ?? null,
    })
  );
  localStorage.setItem(getScopedLocalKey(), JSON.stringify(serialized));
}

function removeLocalDocumento(id: string): void {
  const list = getLocalDocumentos().filter((d) => d.id !== id);
  const serialized = list.map((d) => ({
    ...d,
    dataEmissao: d.dataEmissao?.toISOString?.() ?? null,
    dataValidade: d.dataValidade?.toISOString?.() ?? null,
    dataAlerta: d.dataAlerta?.toISOString?.() ?? null,
    criadoEm: d.criadoEm?.toISOString?.() ?? null,
    atualizadoEm: d.atualizadoEm?.toISOString?.() ?? null,
  }));
  localStorage.setItem(getScopedLocalKey(), JSON.stringify(serialized));
}

const calcularStatusDocumento = (dataValidade: Date): StatusDocumento => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(dataValidade);
  validade.setHours(0, 0, 0, 0);

  const diffTime = validade.getTime() - hoje.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Vencido";
  if (diffDays <= 7) return "Vencendo";
  return "Válido";
};

const mapSnapshotToDocumento = (
  snapshot: QueryDocumentSnapshot<DocumentData>
): Documento => {
  const data = snapshot.data();
  const dataValidade = data.dataValidade
    ? data.dataValidade.toDate()
    : new Date();
  const status = calcularStatusDocumento(dataValidade);

  return {
    id: snapshot.id,
    colaboradorId: data.colaboradorId,
    colaboradorNome: data.colaboradorNome,
    cpf: data.cpf,
    cargo: data.cargo,
    setor: data.setor,
    tipoDocumento: data.tipoDocumento as TipoDocumento,
    numeroDocumento: data.numeroDocumento,
    orgaoEmissor: data.orgaoEmissor,
    dataEmissao: data.dataEmissao ? data.dataEmissao.toDate() : undefined,
    dataValidade,
    status,
    observacoes: data.observacoes,
    anexos: data.anexos || [],
    alertaEnviado: data.alertaEnviado || false,
    dataAlerta: data.dataAlerta ? data.dataAlerta.toDate() : undefined,
    criadoPor: data.criadoPor,
    criadoEm: data.criadoEm ? data.criadoEm.toDate() : new Date(),
    atualizadoEm: data.atualizadoEm ? data.atualizadoEm.toDate() : new Date(),
  };
};

const buildFiltersQuery = (filters?: DocumentoFilters) => {
  const constraints: QueryConstraint[] = [];

  if (filters?.colaboradorNome) {
    constraints.push(
      where(
        "colaboradorNomeSearch",
        "array-contains",
        filters.colaboradorNome.toLowerCase()
      )
    );
  }

  if (filters?.tipoDocumento) {
    constraints.push(where("tipoDocumento", "==", filters.tipoDocumento));
  }

  if (filters?.dataVencimentoInicio) {
    constraints.push(
      where(
        "dataValidade",
        ">=",
        Timestamp.fromDate(filters.dataVencimentoInicio)
      )
    );
  }

  if (filters?.dataVencimentoFim) {
    constraints.push(
      where("dataValidade", "<=", Timestamp.fromDate(filters.dataVencimentoFim))
    );
  }

  constraints.push(orderBy("dataValidade", "asc"));

  return query(documentosCollection, ...constraints);
};

const applyFiltersToDocumentos = (
  documentos: Documento[],
  filters?: DocumentoFilters
): Documento[] => {
  let result = documentos;
  if (filters?.status) {
    result = result.filter((d) => d.status === filters.status);
  }
  if (filters?.vencidos) {
    result = result.filter((d) => d.status === "Vencido");
  }
  if (filters?.vencendoEm7Dias) {
    result = result.filter((d) => d.status === "Vencendo");
  }
  if (filters?.vencendoEm30Dias) {
    const hoje = new Date();
    const trintaDias = new Date(hoje);
    trintaDias.setDate(trintaDias.getDate() + 30);
    result = result.filter(
      (d) =>
        d.dataValidade >= hoje &&
        d.dataValidade <= trintaDias &&
        d.status !== "Vencido"
    );
  }
  return result;
};

export const documentacoesService = {
  async list(filters?: DocumentoFilters): Promise<Documento[]> {
    await assertRole(["admin", "gestor"], "listar documentações");
    if (!isFirebaseConfigured()) {
      return applyFiltersToDocumentos(getLocalDocumentos(), filters);
    }

    try {
      const q = buildFiltersQuery(filters);
      const fetchDocs = (): Promise<Documento[]> =>
        getDocs(q).then((snapshot) =>
          snapshot.docs.map(mapSnapshotToDocumento)
        );
      let documentos = await Promise.race([
        fetchDocs(),
        timeoutPromise<Documento[]>(LIST_TIMEOUT_MS, "list_timeout"),
      ]);

      const local = getLocalDocumentos();
      const merged = [...documentos];
      for (const d of local) {
        if (!merged.some((m) => m.id === d.id)) merged.push(d);
      }
      merged.sort(
        (a, b) =>
          new Date(a.dataValidade).getTime() - new Date(b.dataValidade).getTime()
      );

      return applyFiltersToDocumentos(merged, filters);
    } catch (error) {
      console.error("Erro ao listar documentos:", error);
      return applyFiltersToDocumentos(getLocalDocumentos(), filters);
    }
  },

  async create(data: DocumentoFormData, criadoPor: string): Promise<string> {
    await assertRole(["admin", "gestor"], "criar documentação");
    validateRequiredString(data.colaboradorNome, "Nome do colaborador", 2, 120);
    validateRequiredString(data.numeroDocumento, "Número do documento", 1, 80);

    const dataValidade =
      data.dataValidade instanceof Date
        ? data.dataValidade
        : new Date(data.dataValidade as unknown as string);
    const dataEmissao = data.dataEmissao
      ? data.dataEmissao instanceof Date
        ? data.dataEmissao
        : new Date(data.dataEmissao as unknown as string)
      : undefined;
    const status = calcularStatusDocumento(dataValidade);
    const now = new Date();
    const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    if (!isFirebaseConfigured()) {
      const doc: Documento = {
        id: localId,
        colaboradorId: data.colaboradorId,
        colaboradorNome: data.colaboradorNome,
        cpf: data.cpf,
        cargo: data.cargo,
        setor: data.setor,
        tipoDocumento: data.tipoDocumento,
        numeroDocumento: data.numeroDocumento,
        orgaoEmissor: data.orgaoEmissor,
        dataEmissao,
        dataValidade,
        status,
        observacoes: data.observacoes,
        anexos: [],
        alertaEnviado: false,
        criadoPor,
        criadoEm: now,
        atualizadoEm: now,
      };
      saveLocalDocumento(doc);
      return localId;
    }

    const payload = {
      ownerUid: criadoPor,
      colaboradorId: data.colaboradorId,
      colaboradorNome: data.colaboradorNome,
      cpf: data.cpf,
      cargo: data.cargo,
      setor: data.setor,
      tipoDocumento: data.tipoDocumento,
      numeroDocumento: data.numeroDocumento ?? "",
      orgaoEmissor: data.orgaoEmissor ?? "",
      dataEmissao: dataEmissao ? Timestamp.fromDate(dataEmissao) : null,
      dataValidade: Timestamp.fromDate(dataValidade),
      status,
      colaboradorNomeSearch: data.colaboradorNome
        .toLowerCase()
        .split(" ")
        .filter((word) => word.length > 0),
      anexos: [],
      alertaEnviado: false,
      criadoPor,
      criadoEm: Timestamp.now(),
      atualizadoEm: Timestamp.now(),
    };

    try {
      const docRef = await Promise.race([
        addDoc(documentosCollection, payload),
        timeoutPromise<ReturnType<typeof addDoc>>(CREATE_TIMEOUT_MS, "timeout"),
      ]);
      return docRef.id;
    } catch (error) {
      console.error("Erro ao criar documento:", error);
      const doc: Documento = {
        id: localId,
        colaboradorId: data.colaboradorId,
        colaboradorNome: data.colaboradorNome,
        cpf: data.cpf,
        cargo: data.cargo,
        setor: data.setor,
        tipoDocumento: data.tipoDocumento,
        numeroDocumento: data.numeroDocumento,
        orgaoEmissor: data.orgaoEmissor,
        dataEmissao,
        dataValidade,
        status,
        observacoes: data.observacoes,
        anexos: [],
        alertaEnviado: false,
        criadoPor,
        criadoEm: now,
        atualizadoEm: now,
      };
      saveLocalDocumento(doc);
      return localId;
    }
  },

  async update(
    id: string,
    data: Partial<DocumentoFormData>
  ): Promise<void> {
    await assertRole(["admin", "gestor"], "atualizar documentação");
    if (id.startsWith("local-")) {
      const list = getLocalDocumentos();
      const idx = list.findIndex((d) => d.id === id);
      if (idx === -1) return;
      const dataValidade = data.dataValidade
        ? data.dataValidade instanceof Date
          ? data.dataValidade
          : new Date(data.dataValidade as unknown as string)
        : list[idx].dataValidade;
      const current = list[idx];
      list[idx] = {
        ...current,
        ...data,
        dataValidade,
        dataEmissao: data.dataEmissao ?? current.dataEmissao,
        status: calcularStatusDocumento(dataValidade),
        atualizadoEm: new Date(),
        anexos: current.anexos,
      };
      saveLocalDocumento(list[idx]);
      return;
    }

    const updateData: Record<string, unknown> = {
      atualizadoEm: Timestamp.now(),
    };

    if (data.tipoDocumento) updateData.tipoDocumento = data.tipoDocumento;
    if (data.numeroDocumento !== undefined)
      updateData.numeroDocumento = data.numeroDocumento;
    if (data.orgaoEmissor !== undefined)
      updateData.orgaoEmissor = data.orgaoEmissor;
    if (data.dataEmissao !== undefined)
      updateData.dataEmissao = data.dataEmissao
        ? Timestamp.fromDate(data.dataEmissao)
        : null;
    if (data.dataValidade) {
      updateData.dataValidade = Timestamp.fromDate(data.dataValidade);
      updateData.status = calcularStatusDocumento(data.dataValidade);
    }
    if (data.observacoes !== undefined)
      updateData.observacoes = data.observacoes;
    if (data.colaboradorNome) {
      updateData.colaboradorNome = data.colaboradorNome;
      updateData.colaboradorNomeSearch = data.colaboradorNome
        .toLowerCase()
        .split(" ")
        .filter((word) => word.length > 0);
    }
    if (data.cpf) updateData.cpf = data.cpf;
    if (data.cargo) updateData.cargo = data.cargo;
    if (data.setor) updateData.setor = data.setor;

    await updateDoc(doc(documentosCollection, id), updateData);
  },

  async delete(id: string): Promise<void> {
    await assertRole(["admin", "gestor"], "deletar documentação");
    if (id.startsWith("local-")) {
      removeLocalDocumento(id);
      return;
    }
    await deleteDoc(doc(documentosCollection, id));
  },

  async getStats(): Promise<DocumentoStats> {
    await assertRole(["admin", "gestor"], "consultar estatísticas de documentação");
    const snapshot = await getDocs(documentosCollection);
    const documentos = snapshot.docs.map(mapSnapshotToDocumento);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const seteDias = new Date(hoje);
    seteDias.setDate(seteDias.getDate() + 7);
    const trintaDias = new Date(hoje);
    trintaDias.setDate(trintaDias.getDate() + 30);

    return {
      total: documentos.length,
      validos: documentos.filter(
        (d) =>
          d.status === "Válido" &&
          d.dataValidade > trintaDias
      ).length,
      vencidos: documentos.filter((d) => d.status === "Vencido").length,
      vencendoEm7Dias: documentos.filter(
        (d) =>
          d.status === "Vencendo" &&
          d.dataValidade >= hoje &&
          d.dataValidade <= seteDias
      ).length,
      vencendoEm30Dias: documentos.filter(
        (d) =>
          d.dataValidade >= hoje &&
          d.dataValidade <= trintaDias &&
          d.status !== "Vencido"
      ).length,
      pendentes: documentos.filter((d) => d.status === "Pendente").length,
    };
  },

  async getDocumentosVencidos(): Promise<Documento[]> {
    await assertRole(["admin", "gestor"], "consultar documentos vencidos");
    const snapshot = await getDocs(documentosCollection);
    const documentos = snapshot.docs.map(mapSnapshotToDocumento);
    return documentos.filter((d) => d.status === "Vencido");
  },

  async getDocumentosVencendo(): Promise<Documento[]> {
    await assertRole(["admin", "gestor"], "consultar documentos vencendo");
    const snapshot = await getDocs(documentosCollection);
    const documentos = snapshot.docs.map(mapSnapshotToDocumento);
    return documentos.filter((d) => d.status === "Vencendo");
  },

  async marcarAlertaEnviado(id: string): Promise<void> {
    await assertRole(["admin", "gestor"], "marcar alerta enviado");
    await updateDoc(doc(documentosCollection, id), {
      alertaEnviado: true,
      dataAlerta: Timestamp.now(),
      atualizadoEm: Timestamp.now(),
    });
  },

  // Treinamentos
  async listTreinamentos(): Promise<Treinamento[]> {
    await assertRole(["admin", "gestor"], "listar treinamentos");
    const q = query(treinamentosCollection, orderBy("dataInicio", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        titulo: data.titulo,
        descricao: data.descricao,
        dataInicio: data.dataInicio.toDate(),
        dataFim: data.dataFim.toDate(),
        colaboradores: data.colaboradores || [],
        tipoDocumento: data.tipoDocumento as TipoDocumento,
        status: data.status as Treinamento["status"],
        criadoEm: data.criadoEm.toDate(),
        atualizadoEm: data.atualizadoEm.toDate(),
      };
    });
  },

  async createTreinamento(
    data: TreinamentoFormData
  ): Promise<string> {
    await assertRole(["admin", "gestor"], "criar treinamento");
    validateRequiredString(data.titulo, "Título do treinamento", 2, 160);

    const hoje = new Date();
    let status: Treinamento["status"] = "Agendado";
    if (data.dataInicio <= hoje && data.dataFim >= hoje) {
      status = "Em andamento";
    } else if (data.dataFim < hoje) {
      status = "Concluído";
    }

    const payload = {
      ...data,
      ownerUid: auth.currentUser?.uid ?? "unknown",
      dataInicio: Timestamp.fromDate(data.dataInicio),
      dataFim: Timestamp.fromDate(data.dataFim),
      status,
      criadoEm: Timestamp.now(),
      atualizadoEm: Timestamp.now(),
    };

    const docRef = await addDoc(treinamentosCollection, payload);
    return docRef.id;
  },

  async updateTreinamento(
    id: string,
    data: Partial<TreinamentoFormData>
  ): Promise<void> {
    await assertRole(["admin", "gestor"], "atualizar treinamento");
    const updateData: Record<string, unknown> = {
      atualizadoEm: Timestamp.now(),
    };

    if (data.titulo) updateData.titulo = data.titulo;
    if (data.descricao) updateData.descricao = data.descricao;
    if (data.dataInicio) {
      updateData.dataInicio = Timestamp.fromDate(data.dataInicio);
    }
    if (data.dataFim) {
      updateData.dataFim = Timestamp.fromDate(data.dataFim);
    }
    if (data.colaboradores) updateData.colaboradores = data.colaboradores;
    if (data.tipoDocumento) updateData.tipoDocumento = data.tipoDocumento;

    // Recalcular status
    const docRef = doc(treinamentosCollection, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const existing = docSnap.data();
      const dataInicio = data.dataInicio
        ? data.dataInicio
        : existing.dataInicio.toDate();
      const dataFim = data.dataFim
        ? data.dataFim
        : existing.dataFim.toDate();
      const hoje = new Date();

      if (dataInicio <= hoje && dataFim >= hoje) {
        updateData.status = "Em andamento";
      } else if (dataFim < hoje) {
        updateData.status = "Concluído";
      } else {
        updateData.status = "Agendado";
      }
    }

    await updateDoc(doc(treinamentosCollection, id), updateData);
  },

  async deleteTreinamento(id: string): Promise<void> {
    await assertRole(["admin", "gestor"], "deletar treinamento");
    await deleteDoc(doc(treinamentosCollection, id));
  },
};

