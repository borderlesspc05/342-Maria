// src/services/documentosFinanceirosService.ts

import { auth, db } from "../lib/firebaseconfig";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  type DocumentData,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import type {
  NotaFiscal,
  ComprovanteBancario,
  NotaFiscalFormData,
  ComprovanteBancarioFormData,
  DocumentoFinanceiroFilters,
} from "../types/documentosFinanceiros";
import {
  assertRole,
  validatePositiveNumber,
  validateRequiredString,
} from "./securityService";

const NOTAS_FISCAIS_COLLECTION = "notas_fiscais";
const COMPROVANTES_COLLECTION = "comprovantes_bancarios";
const STORAGE_PATH = "documentos_financeiros";
const LOCAL_NOTAS_KEY = "documentos_financeiros_notas_local";
const CREATE_TIMEOUT_MS = 20000;
const LIST_TIMEOUT_MS = 10000;

function isFirebaseConfigured(): boolean {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  return typeof projectId === "string" && projectId.trim().length > 0;
}

function getScopedLocalKey(): string {
  const uid = auth.currentUser?.uid ?? "anon";
  return `${LOCAL_NOTAS_KEY}:${uid}`;
}

function timeoutPromise<T>(ms: number, message: string): Promise<T> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(message)), ms)
  );
}

function getLocalNotasFiscais(): NotaFiscal[] {
  try {
    const raw = localStorage.getItem(getScopedLocalKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    return parsed.map((n) => ({
      ...n,
      dataEmissao: n.dataEmissao ? new Date(n.dataEmissao as string) : new Date(),
      dataVencimento: n.dataVencimento ? new Date(n.dataVencimento as string) : undefined,
      criadoEm: n.criadoEm ? new Date(n.criadoEm as string) : new Date(),
      atualizadoEm: n.atualizadoEm ? new Date(n.atualizadoEm as string) : new Date(),
      arquivo: {
        ...(n.arquivo as object),
        dataUpload: n.arquivo && (n.arquivo as Record<string, unknown>).dataUpload
          ? new Date((n.arquivo as Record<string, unknown>).dataUpload as string)
          : new Date(),
      },
    })) as NotaFiscal[];
  } catch {
    return [];
  }
}

function serializeNota(n: NotaFiscal): Record<string, unknown> {
  return {
    ...n,
    dataEmissao: n.dataEmissao?.toISOString?.() ?? null,
    dataVencimento: n.dataVencimento?.toISOString?.() ?? null,
    criadoEm: n.criadoEm?.toISOString?.() ?? null,
    atualizadoEm: n.atualizadoEm?.toISOString?.() ?? null,
    arquivo: n.arquivo
      ? { ...n.arquivo, dataUpload: n.arquivo.dataUpload?.toISOString?.() ?? null }
      : null,
  };
}

function saveLocalNotaFiscal(nota: NotaFiscal): void {
  const list = getLocalNotasFiscais();
  const idx = list.findIndex((n) => n.id === nota.id);
  if (idx >= 0) {
    list[idx] = nota;
  } else {
    list.push(nota);
  }
  localStorage.setItem(
    getScopedLocalKey(),
    JSON.stringify(list.map(serializeNota))
  );
}

function removeLocalNotaFiscal(id: string): void {
  const list = getLocalNotasFiscais().filter((n) => n.id !== id);
  const serialized = list.map((n) => ({
    ...n,
    dataEmissao: n.dataEmissao?.toISOString?.() ?? null,
    dataVencimento: n.dataVencimento?.toISOString?.() ?? null,
    criadoEm: n.criadoEm?.toISOString?.() ?? null,
    atualizadoEm: n.atualizadoEm?.toISOString?.() ?? null,
    arquivo: n.arquivo
      ? { ...n.arquivo, dataUpload: n.arquivo.dataUpload?.toISOString?.() ?? null }
      : null,
  }));
  localStorage.setItem(getScopedLocalKey(), JSON.stringify(serialized));
}

// Converter Timestamp para Date
function convertTimestampToDate(data: DocumentData): DocumentData {
  if (!data) return data;
  const converted = { ...data };
  Object.keys(converted).forEach((key) => {
    if (converted[key] instanceof Timestamp) {
      converted[key] = converted[key].toDate();
    }
    if (converted[key]?.dataUpload instanceof Timestamp) {
      converted[key].dataUpload = converted[key].dataUpload.toDate();
    }
  });
  return converted;
}

// Upload de arquivo para Firebase Storage
async function uploadArquivo(
  file: File,
  userId: string,
  tipo: string
): Promise<{
  id: string;
  nome: string;
  url: string;
  tamanho: number;
  tipo: string;
  dataUpload: Date;
}> {
  const storage = getStorage();
  const timestamp = Date.now();
  const nomeArquivo = `${tipo}_${userId}_${timestamp}_${file.name}`;
  const storageRef = ref(storage, `${STORAGE_PATH}/${nomeArquivo}`);

  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  return {
    id: storageRef.name,
    nome: file.name,
    url,
    tamanho: file.size,
    tipo: file.type,
    dataUpload: new Date(),
  };
}

// Deletar arquivo do Storage
async function deletarArquivo(path: string): Promise<void> {
  const storage = getStorage();
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}

export const documentosFinanceirosService = {
  // ============== NOTAS FISCAIS ==============

  async criarNotaFiscal(
    data: NotaFiscalFormData,
    userId: string
  ): Promise<NotaFiscal> {
    await assertRole(["admin", "gestor"], "criar nota fiscal");
    validateRequiredString(data.numero, "Número da nota", 1, 80);
    validateRequiredString(data.fornecedor, "Fornecedor", 2, 120);
    validatePositiveNumber(data.valor, "Valor da nota");

    const now = new Date();
    const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const buildLocalNota = (arquivo: NotaFiscal["arquivo"]): NotaFiscal => {
      const nota: NotaFiscal = {
        id: localId,
        numero: data.numero,
        serie: data.serie,
        fornecedor: data.fornecedor,
        cnpjFornecedor: data.cnpjFornecedor,
        valor: data.valor,
        dataEmissao: data.dataEmissao,
        dataVencimento: data.dataVencimento,
        tipo: data.tipo,
        categoria: data.categoria,
        descricao: data.descricao,
        arquivo,
        status: "pendente",
        criadoPor: userId,
        criadoEm: now,
        atualizadoEm: now,
      };
      return nota;
    };

    if (!isFirebaseConfigured()) {
      const nota = buildLocalNota({
        id: localId,
        nome: data.arquivo.name,
        url: "",
        tamanho: data.arquivo.size,
        tipo: data.arquivo.type,
        dataUpload: now,
      });
      saveLocalNotaFiscal(nota);
      return nota;
    }

    const doCreate = async (): Promise<NotaFiscal> => {
      const arquivo = await uploadArquivo(data.arquivo, userId, "nota_fiscal");
      const notaFiscalData = {
        ...data,
        ownerUid: userId,
        arquivo: {
          ...arquivo,
          dataUpload: arquivo.dataUpload,
        },
        status: "pendente" as const,
        criadoPor: userId,
        criadoEm: now,
        atualizadoEm: now,
      };
      const docRef = await addDoc(
        collection(db, NOTAS_FISCAIS_COLLECTION),
        notaFiscalData
      );
      return { id: docRef.id, ...notaFiscalData } as NotaFiscal;
    };

    try {
      const nota = await Promise.race([
        doCreate(),
        timeoutPromise<NotaFiscal>(CREATE_TIMEOUT_MS, "timeout"),
      ]);
      return nota;
    } catch (error) {
      console.error("Erro ao criar nota fiscal:", error);
      const nota = buildLocalNota({
        id: localId,
        nome: data.arquivo.name,
        url: "",
        tamanho: data.arquivo.size,
        tipo: data.arquivo.type,
        dataUpload: now,
      });
      saveLocalNotaFiscal(nota);
      return nota;
    }
  },

  async listarNotasFiscais(
    filters?: DocumentoFinanceiroFilters
  ): Promise<NotaFiscal[]> {
    await assertRole(["admin", "gestor"], "listar notas fiscais");
    const applyFilters = (notas: NotaFiscal[]): NotaFiscal[] => {
      let result = notas;
      if (filters?.valorMin) {
        result = result.filter((n) => n.valor >= filters!.valorMin!);
      }
      if (filters?.valorMax) {
        result = result.filter((n) => n.valor <= filters!.valorMax!);
      }
      if (filters?.busca) {
        const buscaLower = filters.busca!.toLowerCase();
        result = result.filter(
          (n) =>
            n.numero.toLowerCase().includes(buscaLower) ||
            n.fornecedor.toLowerCase().includes(buscaLower) ||
            (n.descricao && n.descricao.toLowerCase().includes(buscaLower))
        );
      }
      if (filters?.status) {
        result = result.filter((n) => n.status === filters!.status);
      }
      if (filters?.dataInicio) {
        result = result.filter(
          (n) => n.dataEmissao >= (filters!.dataInicio as Date)
        );
      }
      if (filters?.dataFim) {
        result = result.filter(
          (n) => n.dataEmissao <= (filters!.dataFim as Date)
        );
      }
      return result;
    };

    if (!isFirebaseConfigured()) {
      return applyFilters(getLocalNotasFiscais());
    }

    try {
      let q = query(
        collection(db, NOTAS_FISCAIS_COLLECTION),
        orderBy("criadoEm", "desc")
      );

      if (filters?.status) {
        q = query(q, where("status", "==", filters.status));
      }

      if (filters?.dataInicio) {
        q = query(q, where("dataEmissao", ">=", Timestamp.fromDate(filters.dataInicio)));
      }

      if (filters?.dataFim) {
        q = query(q, where("dataEmissao", "<=", Timestamp.fromDate(filters.dataFim)));
      }

      const fetchNotas = (): Promise<NotaFiscal[]> =>
        getDocs(q).then((snapshot) =>
          snapshot.docs.map((d) => {
            const data = convertTimestampToDate(d.data());
            return { id: d.id, ...data } as NotaFiscal;
          })
        );

      const notas = await Promise.race([
        fetchNotas(),
        timeoutPromise<NotaFiscal[]>(LIST_TIMEOUT_MS, "list_timeout"),
      ]);

      const local = getLocalNotasFiscais();
      const merged = [...notas];
      for (const n of local) {
        if (!merged.some((m) => m.id === n.id)) merged.push(n);
      }
      merged.sort(
        (a, b) =>
          new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
      );

      return applyFilters(merged);
    } catch (error) {
      console.error("Erro ao listar notas fiscais:", error);
      return applyFilters(getLocalNotasFiscais());
    }
  },

  async atualizarNotaFiscal(
    id: string,
    data: Partial<NotaFiscal>
  ): Promise<void> {
    await assertRole(["admin", "gestor"], "atualizar nota fiscal");
    try {
      const docRef = doc(db, NOTAS_FISCAIS_COLLECTION, id);
      await updateDoc(docRef, {
        ...data,
        atualizadoEm: new Date(),
      });
    } catch (error) {
      console.error("Erro ao atualizar nota fiscal:", error);
      throw new Error("Erro ao atualizar nota fiscal");
    }
  },

  async deletarNotaFiscal(id: string): Promise<void> {
    await assertRole(["admin", "gestor"], "deletar nota fiscal");
    if (id.startsWith("local-")) {
      removeLocalNotaFiscal(id);
      return;
    }
    try {
      const docRef = doc(db, NOTAS_FISCAIS_COLLECTION, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as NotaFiscal;
        if (data.arquivo?.id) {
          try {
            await deletarArquivo(`${STORAGE_PATH}/${data.arquivo.id}`);
          } catch {
            // segue mesmo se falhar o delete do storage
          }
        }
        await deleteDoc(docRef);
      }
    } catch (error) {
      console.error("Erro ao deletar nota fiscal:", error);
      throw new Error("Erro ao deletar nota fiscal");
    }
  },

  // ============== COMPROVANTES BANCÁRIOS ==============

  async criarComprovanteBancario(
    data: ComprovanteBancarioFormData,
    userId: string
  ): Promise<ComprovanteBancario> {
    await assertRole(["admin", "gestor"], "criar comprovante bancário");
    validateRequiredString(data.beneficiario, "Beneficiário", 2, 120);
    validatePositiveNumber(data.valor, "Valor do comprovante");

    try {
      // Upload do arquivo
      const arquivo = await uploadArquivo(data.arquivo, userId, "comprovante");

      const comprovanteData = {
        ...data,
        ownerUid: userId,
        arquivo,
        status: "pendente" as const,
        criadoPor: userId,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      };

      const docRef = await addDoc(
        collection(db, COMPROVANTES_COLLECTION),
        comprovanteData
      );

      return {
        id: docRef.id,
        ...comprovanteData,
      } as ComprovanteBancario;
    } catch (error) {
      console.error("Erro ao criar comprovante bancário:", error);
      throw new Error("Erro ao criar comprovante bancário");
    }
  },

  async listarComprovantesBancarios(
    filters?: DocumentoFinanceiroFilters
  ): Promise<ComprovanteBancario[]> {
    await assertRole(["admin", "gestor"], "listar comprovantes bancários");
    try {
      let q = query(
        collection(db, COMPROVANTES_COLLECTION),
        orderBy("criadoEm", "desc")
      );

      if (filters?.status) {
        q = query(q, where("status", "==", filters.status));
      }

      if (filters?.dataInicio) {
        q = query(q, where("dataTransacao", ">=", filters.dataInicio));
      }

      if (filters?.dataFim) {
        q = query(q, where("dataTransacao", "<=", filters.dataFim));
      }

      const snapshot = await getDocs(q);
      let comprovantes = snapshot.docs.map((doc) => {
        const data = convertTimestampToDate(doc.data());
        return {
          id: doc.id,
          ...data,
        } as ComprovanteBancario;
      });

      // Filtros adicionais
      if (filters?.valorMin) {
        comprovantes = comprovantes.filter((c) => c.valor >= filters.valorMin!);
      }

      if (filters?.valorMax) {
        comprovantes = comprovantes.filter((c) => c.valor <= filters.valorMax!);
      }

      if (filters?.busca) {
        const buscaLower = filters.busca.toLowerCase();
        comprovantes = comprovantes.filter(
          (c) =>
            c.beneficiario.toLowerCase().includes(buscaLower) ||
            c.descricao.toLowerCase().includes(buscaLower) ||
            c.numeroDocumento?.toLowerCase().includes(buscaLower)
        );
      }

      return comprovantes;
    } catch (error) {
      console.error("Erro ao listar comprovantes bancários:", error);
      throw new Error("Erro ao listar comprovantes bancários");
    }
  },

  async atualizarComprovanteBancario(
    id: string,
    data: Partial<ComprovanteBancario>
  ): Promise<void> {
    await assertRole(["admin", "gestor"], "atualizar comprovante bancário");
    try {
      const docRef = doc(db, COMPROVANTES_COLLECTION, id);
      await updateDoc(docRef, {
        ...data,
        atualizadoEm: new Date(),
      });
    } catch (error) {
      console.error("Erro ao atualizar comprovante bancário:", error);
      throw new Error("Erro ao atualizar comprovante bancário");
    }
  },

  async deletarComprovanteBancario(id: string): Promise<void> {
    await assertRole(["admin", "gestor"], "deletar comprovante bancário");
    try {
      const docRef = doc(db, COMPROVANTES_COLLECTION, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as ComprovanteBancario;
        // Deletar arquivo do storage
        if (data.arquivo?.id) {
          await deletarArquivo(`${STORAGE_PATH}/${data.arquivo.id}`);
        }
        // Deletar documento
        await deleteDoc(docRef);
      }
    } catch (error) {
      console.error("Erro ao deletar comprovante bancário:", error);
      throw new Error("Erro ao deletar comprovante bancário");
    }
  },
};
