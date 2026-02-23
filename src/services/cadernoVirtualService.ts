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
  QueryConstraint,
  QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db } from "../lib/firebaseconfig";
import { storageService } from "./storageService";
import type {
  AnexoLancamento,
  LancamentoDiario,
  LancamentoFormData,
  LancamentoFilters,
  LancamentoStats,
  LancamentoStatus,
  TipoMovimentacao,
} from "../types/cadernoVirtual";

const STORAGE_BASE_PATH_CADERNO = "caderno_virtual";

const LANCAMENTOS_COLLECTION = "lancamentosDiarios";
const LOCAL_LANCAMENTOS_KEY = "caderno_virtual_lancamentos_local";
const CREATE_TIMEOUT_MS = 30000;
const UPDATE_TIMEOUT_MS = 30000;
const LIST_TIMEOUT_MS = 10000;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/** Converte File[] em AnexoLancamento[]: tenta Storage; se falhar ou não estiver ativo, usa base64. */
async function convertFilesToAnexos(files: File[]): Promise<AnexoLancamento[]> {
  if (files.length === 0) return [];

  const toBase64Anexos = async (): Promise<AnexoLancamento[]> => {
    const result: AnexoLancamento[] = [];
    for (const file of files) {
      const base64 = await fileToBase64(file);
      result.push({
        id: `anexo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        nome: file.name,
        tipo: file.type,
        url: base64,
        tamanho: file.size,
        dataUpload: new Date(),
      });
    }
    return result;
  };

  if (!isFirebaseConfigured() || !storageService.isStorageAvailable()) {
    return toBase64Anexos();
  }

  try {
    const uploaded = await Promise.race([
      storageService.uploadFiles(files, STORAGE_BASE_PATH_CADERNO),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Storage timeout")), 15000)
      ),
    ]);
    return uploaded.map((r) => ({
      id: r.id,
      nome: r.nome,
      tipo: r.tipo,
      url: r.url,
      tamanho: r.tamanho,
      dataUpload: r.dataUpload,
      storagePath: r.storagePath,
    }));
  } catch (err) {
    console.warn("Upload para Storage falhou, usando base64:", err);
    return toBase64Anexos();
  }
}

function mapRawAnexo(a: Record<string, unknown>): AnexoLancamento {
  return {
    id: a.id as string,
    nome: a.nome as string,
    tipo: a.tipo as string,
    url: a.url as string,
    tamanho: a.tamanho as number,
    dataUpload:
      a.dataUpload instanceof Timestamp
        ? a.dataUpload.toDate()
        : a.dataUpload
          ? new Date(a.dataUpload as string)
          : new Date(),
    storagePath: a.storagePath as string | undefined,
  };
}

/** Cache do último resultado Firebase para não perder a lista quando a consulta falha (ex.: após atualizar status) */
let lastFirebaseItems: LancamentoDiario[] = [];

function isFirebaseConfigured(): boolean {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  return typeof projectId === "string" && projectId.trim().length > 0;
}

function timeoutPromise<T>(ms: number, message: string): Promise<T> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(message)), ms)
  );
}

function getLocalLancamentos(): LancamentoDiario[] {
  try {
    const raw = localStorage.getItem(LOCAL_LANCAMENTOS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    return parsed.map((item) => ({
      ...item,
      dataLancamento: item.dataLancamento
        ? new Date(item.dataLancamento as string)
        : new Date(),
      criadoEm: item.criadoEm ? new Date(item.criadoEm as string) : new Date(),
      atualizadoEm: item.atualizadoEm
        ? new Date(item.atualizadoEm as string)
        : new Date(),
      anexos: (item.anexos as LancamentoDiario["anexos"]) || [],
    })) as LancamentoDiario[];
  } catch {
    return [];
  }
}

function serializeLancamento(l: LancamentoDiario): Record<string, unknown> {
  return {
    ...l,
    dataLancamento: l.dataLancamento?.toISOString?.() ?? null,
    criadoEm: l.criadoEm?.toISOString?.() ?? null,
    atualizadoEm: l.atualizadoEm?.toISOString?.() ?? null,
    anexos: (l.anexos || []).map((a) => ({
      ...a,
      dataUpload: a.dataUpload?.toISOString?.() ?? null,
    })),
  };
}

function saveLocalLancamento(lancamento: LancamentoDiario): void {
  const list = getLocalLancamentos();
  const idx = list.findIndex((n) => n.id === lancamento.id);
  if (idx >= 0) {
    list[idx] = lancamento;
  } else {
    list.push(lancamento);
  }
  localStorage.setItem(
    LOCAL_LANCAMENTOS_KEY,
    JSON.stringify(list.map(serializeLancamento))
  );
}

function removeLocalLancamento(id: string): void {
  const list = getLocalLancamentos().filter((n) => n.id !== id);
  localStorage.setItem(
    LOCAL_LANCAMENTOS_KEY,
    JSON.stringify(list.map(serializeLancamento))
  );
}

const lancamentosCollection = collection(db, LANCAMENTOS_COLLECTION);

const mapSnapshotToLancamento = (
  snapshot: QueryDocumentSnapshot<DocumentData>
): LancamentoDiario => {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    tipoMovimentacao: data.tipoMovimentacao as TipoMovimentacao,
    descricao: data.descricao,
    valor: data.valor,
    dataLancamento: data.dataLancamento
      ? data.dataLancamento.toDate()
      : new Date(),
    status: data.status as LancamentoStatus,
    colaboradorId: data.colaboradorId,
    colaboradorNome: data.colaboradorNome,
    observacoes: data.observacoes,
    anexos: ((data.anexos as Record<string, unknown>[]) || []).map(mapRawAnexo),
    criadoPor: data.criadoPor,
    criadoEm: data.criadoEm ? data.criadoEm.toDate() : new Date(),
    atualizadoEm: data.atualizadoEm ? data.atualizadoEm.toDate() : new Date(),
  };
};

const buildFiltersQuery = (filters?: LancamentoFilters) => {
  const constraints: QueryConstraint[] = [];

  if (filters?.dataInicio) {
    constraints.push(
      where("dataLancamento", ">=", Timestamp.fromDate(filters.dataInicio))
    );
  }

  if (filters?.dataFim) {
    const dataFim = new Date(filters.dataFim);
    dataFim.setHours(23, 59, 59, 999);
    constraints.push(
      where("dataLancamento", "<=", Timestamp.fromDate(dataFim))
    );
  }

  if (filters?.colaboradorId) {
    constraints.push(where("colaboradorId", "==", filters.colaboradorId));
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

  if (filters?.tipoMovimentacao) {
    constraints.push(where("tipoMovimentacao", "==", filters.tipoMovimentacao));
  }

  if (filters?.status) {
    constraints.push(where("status", "==", filters.status));
  }

  constraints.push(orderBy("dataLancamento", "desc"));

  return query(lancamentosCollection, ...constraints);
};

function applyFiltersInMemory(
  items: LancamentoDiario[],
  filters?: LancamentoFilters
): LancamentoDiario[] {
  if (!filters) return items;
  let result = [...items];
  if (filters.dataInicio) {
    result = result.filter(
      (e) => new Date(e.dataLancamento).getTime() >= filters.dataInicio!.getTime()
    );
  }
  if (filters.dataFim) {
    const fim = new Date(filters.dataFim);
    fim.setHours(23, 59, 59, 999);
    result = result.filter(
      (e) => new Date(e.dataLancamento).getTime() <= fim.getTime()
    );
  }
  if (filters.colaboradorId) {
    result = result.filter((e) => e.colaboradorId === filters!.colaboradorId);
  }
  if (filters.colaboradorNome) {
    const term = filters.colaboradorNome.toLowerCase();
    result = result.filter((e) =>
      e.colaboradorNome?.toLowerCase().includes(term)
    );
  }
  if (filters.tipoMovimentacao) {
    result = result.filter((e) => e.tipoMovimentacao === filters!.tipoMovimentacao);
  }
  if (filters.status) {
    result = result.filter((e) => e.status === filters!.status);
  }
  result.sort(
    (a, b) =>
      new Date(b.dataLancamento).getTime() -
      new Date(a.dataLancamento).getTime()
  );
  return result;
}

export const cadernoVirtualService = {
  async list(filters?: LancamentoFilters): Promise<LancamentoDiario[]> {
    const localItems = getLocalLancamentos();

    if (!isFirebaseConfigured()) {
      return applyFiltersInMemory(localItems, filters);
    }

    const doList = async (): Promise<LancamentoDiario[]> => {
      const q = buildFiltersQuery(filters);
      const snapshot = await getDocs(q);
      return snapshot.docs.map(mapSnapshotToLancamento);
    };

    try {
      const firebaseItems = await Promise.race([
        doList(),
        timeoutPromise<LancamentoDiario[]>(LIST_TIMEOUT_MS, "timeout"),
      ]);
      lastFirebaseItems = firebaseItems;
      const merged = [...firebaseItems];
      localItems.forEach((l) => {
        if (!merged.some((m) => m.id === l.id)) merged.push(l);
      });
      return applyFiltersInMemory(merged, filters);
    } catch (error) {
      console.error("Erro ao listar lançamentos (Firebase):", error);
      /* Usa cache do último Firebase + local para não mostrar lista vazia após atualizar status/editar */
      const merged = [...lastFirebaseItems];
      localItems.forEach((l) => {
        if (!merged.some((m) => m.id === l.id)) merged.push(l);
      });
      return applyFiltersInMemory(merged, filters);
    }
  },

  async create(
    data: LancamentoFormData,
    userId: string,
    userName: string
  ): Promise<string> {
    const now = new Date();
    const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const anexosConvertidos = data.anexos?.length
      ? await convertFilesToAnexos(data.anexos)
      : [];

    const buildLocalLancamento = (): LancamentoDiario => ({
      id: localId,
      tipoMovimentacao: data.tipoMovimentacao,
      descricao: data.descricao,
      valor: Number(data.valor),
      dataLancamento: data.dataLancamento,
      status: data.status,
      colaboradorId: data.colaboradorId,
      colaboradorNome: data.colaboradorNome,
      observacoes: data.observacoes,
      anexos: anexosConvertidos,
      criadoPor: userId,
      criadoEm: now,
      atualizadoEm: now,
    });

    if (!isFirebaseConfigured()) {
      const entry = buildLocalLancamento();
      saveLocalLancamento(entry);
      return localId;
    }

    const doCreate = async (): Promise<string> => {
      const { anexos: _files, anexosExistentes: _existentes, ...rest } = data;
      const payload = {
        ...rest,
        valor: Number(data.valor),
        dataLancamento: Timestamp.fromDate(data.dataLancamento),
        colaboradorNomeSearch: data.colaboradorNome
          .toLowerCase()
          .split(" ")
          .filter(Boolean),
        criadoPor: userId,
        criadoPorNome: userName,
        anexos: anexosConvertidos,
        criadoEm: Timestamp.now(),
        atualizadoEm: Timestamp.now(),
      };
      const docRef = await addDoc(lancamentosCollection, payload);
      return docRef.id;
    };

    try {
      return await Promise.race([
        doCreate(),
        timeoutPromise<string>(CREATE_TIMEOUT_MS, "timeout"),
      ]);
    } catch (error) {
      console.error("Erro ao criar lançamento (Firebase):", error);
      const entry = buildLocalLancamento();
      saveLocalLancamento(entry);
      return localId;
    }
  },

  async update(id: string, data: Partial<LancamentoFormData>): Promise<void> {
    const hasAnexoChanges =
      (data.anexos !== undefined && data.anexos.length > 0) ||
      data.anexosExistentes !== undefined;

    if (id.startsWith("local-")) {
      const list = getLocalLancamentos();
      const item = list.find((n) => n.id === id);
      if (!item) return;

      let novoAnexos = item.anexos;
      if (hasAnexoChanges) {
        const novosConvertidos = data.anexos?.length
          ? await convertFilesToAnexos(data.anexos)
          : [];
        const mantidos = data.anexosExistentes ?? item.anexos;
        novoAnexos = [...mantidos, ...novosConvertidos];
      }

      const updated: LancamentoDiario = {
        ...item,
        tipoMovimentacao: data.tipoMovimentacao ?? item.tipoMovimentacao,
        descricao: data.descricao ?? item.descricao,
        valor: data.valor !== undefined ? Number(data.valor) : item.valor,
        dataLancamento: data.dataLancamento ?? item.dataLancamento,
        status: data.status ?? item.status,
        colaboradorId: data.colaboradorId ?? item.colaboradorId,
        colaboradorNome: data.colaboradorNome ?? item.colaboradorNome,
        observacoes:
          data.observacoes !== undefined ? data.observacoes : item.observacoes,
        anexos: novoAnexos,
        atualizadoEm: new Date(),
      };
      saveLocalLancamento(updated);
      return;
    }

    if (!isFirebaseConfigured()) {
      return;
    }

    const docRef = doc(lancamentosCollection, id);
    const payload: Record<string, unknown> = {
      atualizadoEm: Timestamp.now(),
    };
    if (data.tipoMovimentacao !== undefined)
      payload.tipoMovimentacao = data.tipoMovimentacao;
    if (data.descricao !== undefined) payload.descricao = data.descricao;
    if (data.valor !== undefined) payload.valor = Number(data.valor);
    if (data.dataLancamento)
      payload.dataLancamento = Timestamp.fromDate(data.dataLancamento);
    if (data.status !== undefined) payload.status = data.status;
    if (data.colaboradorId !== undefined)
      payload.colaboradorId = data.colaboradorId;
    if (data.colaboradorNome !== undefined) {
      payload.colaboradorNome = data.colaboradorNome;
      payload.colaboradorNomeSearch = data.colaboradorNome
        .toLowerCase()
        .split(" ")
        .filter(Boolean);
    }
    if (data.observacoes !== undefined) payload.observacoes = data.observacoes;

    if (hasAnexoChanges) {
      const novosConvertidos = data.anexos?.length
        ? await convertFilesToAnexos(data.anexos)
        : [];
      const cached = lastFirebaseItems.find((i) => i.id === id);
      const mantidos = data.anexosExistentes ?? cached?.anexos ?? [];
      payload.anexos = [...mantidos, ...novosConvertidos];
    }

    const doUpdate = async (): Promise<void> => {
      await updateDoc(docRef, payload);
      const now = new Date();
      lastFirebaseItems = lastFirebaseItems.map((item) =>
        item.id === id
          ? {
              ...item,
              tipoMovimentacao:
                data.tipoMovimentacao ?? item.tipoMovimentacao,
              descricao: data.descricao ?? item.descricao,
              valor:
                data.valor !== undefined ? Number(data.valor) : item.valor,
              dataLancamento: data.dataLancamento ?? item.dataLancamento,
              status: data.status ?? item.status,
              colaboradorId: data.colaboradorId ?? item.colaboradorId,
              colaboradorNome: data.colaboradorNome ?? item.colaboradorNome,
              observacoes:
                data.observacoes !== undefined
                  ? data.observacoes
                  : item.observacoes,
              atualizadoEm: now,
              anexos: hasAnexoChanges
                ? (payload.anexos as AnexoLancamento[])
                : item.anexos,
            }
          : item
      );
    };

    await Promise.race([
      doUpdate(),
      timeoutPromise<void>(UPDATE_TIMEOUT_MS, "timeout"),
    ]);
  },

  async updateStatus(id: string, status: LancamentoStatus): Promise<void> {
    const now = new Date();
    if (id.startsWith("local-")) {
      const list = getLocalLancamentos();
      const item = list.find((n) => n.id === id);
      if (!item) return;
      saveLocalLancamento({ ...item, status, atualizadoEm: now });
      return;
    }
    const docRef = doc(lancamentosCollection, id);
    await updateDoc(docRef, {
      status,
      atualizadoEm: Timestamp.now(),
    });
    lastFirebaseItems = lastFirebaseItems.map((item) =>
      item.id === id ? { ...item, status, atualizadoEm: now } : item
    );
  },

  async delete(id: string): Promise<void> {
    if (id.startsWith("local-")) {
      removeLocalLancamento(id);
      return;
    }
    const docRef = doc(lancamentosCollection, id);
    await deleteDoc(docRef);
    lastFirebaseItems = lastFirebaseItems.filter((item) => item.id !== id);
  },

  async removeAnexo(lancamentoId: string, anexoId: string): Promise<void> {
    if (lancamentoId.startsWith("local-")) {
      const list = getLocalLancamentos();
      const item = list.find((n) => n.id === lancamentoId);
      if (!item) return;
      saveLocalLancamento({
        ...item,
        anexos: item.anexos.filter((a) => a.id !== anexoId),
        atualizadoEm: new Date(),
      });
      return;
    }

    if (!isFirebaseConfigured()) return;

    const cached = lastFirebaseItems.find((i) => i.id === lancamentoId);
    const anexoRemovido = cached?.anexos?.find((a) => a.id === anexoId);
    if (
      anexoRemovido?.storagePath &&
      storageService.isStorageAvailable()
    ) {
      await storageService.deleteFile(anexoRemovido.storagePath);
    }

    const novosAnexos = (cached?.anexos ?? []).filter((a) => a.id !== anexoId);
    const docRef = doc(lancamentosCollection, lancamentoId);
    await updateDoc(docRef, {
      anexos: novosAnexos.map((a) => ({
        ...a,
        dataUpload: Timestamp.fromDate(a.dataUpload),
      })),
      atualizadoEm: Timestamp.now(),
    });
    lastFirebaseItems = lastFirebaseItems.map((item) =>
      item.id === lancamentoId
        ? { ...item, anexos: novosAnexos, atualizadoEm: new Date() }
        : item
    );
  },

  async getStats(dataInicio?: Date, dataFim?: Date): Promise<LancamentoStats> {
    const filters: LancamentoFilters = {};
    if (dataInicio) filters.dataInicio = dataInicio;
    if (dataFim) filters.dataFim = dataFim;

    const entries = await this.list(filters);

    const totalRecebido = entries
      .filter((e) => e.status === "Recebido")
      .reduce((sum, entry) => sum + entry.valor, 0);

    const totalPendente = entries
      .filter((e) => e.status === "Pendente")
      .reduce((sum, entry) => sum + entry.valor, 0);

    const totalPorTipo: Record<TipoMovimentacao, number> = {
      Serviço: 0,
      Pagamento: 0,
      Recebimento: 0,
      Outro: 0,
    };

    entries.forEach((entry) => {
      totalPorTipo[entry.tipoMovimentacao] += entry.valor;
    });

    return {
      totalRecebido,
      totalPendente,
      totalLancamentos: entries.length,
      totalPorTipo,
    };
  },
};
