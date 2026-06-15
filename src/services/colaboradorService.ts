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
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { auth, db } from "../lib/firebaseconfig";
import type { Colaborador } from "../types/premioProdutividade";
import { assertRole, validateRequiredString } from "./securityService";
import { isFirebaseConfigured } from "../utils/firebaseEnv";

const LOCAL_STORAGE_KEY = "colaboradores_local";
const CREATE_TIMEOUT_MS = 3000;
const LIST_TIMEOUT_MS = 10000;

function normalizeCpf(cpf: string): string {
  return (cpf || "").replace(/\D/g, "");
}

function getScopedLocalKey(): string {
  const uid = auth.currentUser?.uid ?? "anon";
  return `${LOCAL_STORAGE_KEY}:${uid}`;
}

function getColaboradoresCollection() {
  return collection(db, "colaboradores");
}

function mapSnapshotToColaborador(
  snapshot: QueryDocumentSnapshot<DocumentData> 
): Colaborador {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    nome: data.nome ?? "",
    cpf: data.cpf ?? "",
    cargo: data.cargo ?? "",
    setor: data.setor ?? "",
    email: data.email,
    telefone: data.telefone,
    admissao: data.admissao?.toDate?.() ? data.admissao.toDate() : undefined,
  };
}

function getLocalColaboradores(): Colaborador[] {
  try {
    const raw = localStorage.getItem(getScopedLocalKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<{
      id: string;
      nome: string;
      cpf: string;
      cargo: string;
      setor: string;
      email?: string;
      telefone?: string;
      admissao?: string;
    }>;
    return parsed.map((c) => ({
      ...c,
      admissao: c.admissao ? new Date(c.admissao) : undefined,
    }));
  } catch {
    return [];
  }
}

function saveLocalColaborador(colab: Colaborador): void {
  const list = getLocalColaboradores();
  const colabCpf = normalizeCpf(colab.cpf);
  const index = list.findIndex((c) => c.id === colab.id);
  if (index >= 0) {
    list[index] = colab;
  } else {
    const sameCpfIndex = list.findIndex((c) => normalizeCpf(c.cpf) === colabCpf);
    if (sameCpfIndex >= 0) list.splice(sameCpfIndex, 1);
    list.push(colab);
  }
  const toSave = list.map((c) => ({
    id: c.id,
    nome: c.nome,
    cpf: c.cpf,
    cargo: c.cargo,
    setor: c.setor,
    email: c.email,
    telefone: c.telefone,
    admissao: c.admissao instanceof Date ? c.admissao.toISOString() : undefined,
  }));
  localStorage.setItem(getScopedLocalKey(), JSON.stringify(toSave));
}

function removeLocalColaborador(id: string): void {
  const list = getLocalColaboradores().filter((c) => c.id !== id);
  const toSave = list.map((c) => ({
    id: c.id,
    nome: c.nome,
    cpf: c.cpf,
    cargo: c.cargo,
    setor: c.setor,
    email: c.email,
    telefone: c.telefone,
    admissao: c.admissao instanceof Date ? c.admissao.toISOString() : undefined,
  }));
  localStorage.setItem(getScopedLocalKey(), JSON.stringify(toSave));
}

function timeoutPromise<T>(ms: number, message: string): Promise<T> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(message)), ms)
  );
}

export interface ColaboradorFormData {
  nome: string;
  cpf: string;
  cargo: string;
  setor: string;
  email?: string;
  telefone?: string;
  admissao?: Date;
}

export interface CreateColaboradorResult {
  id: string;
  savedLocally?: boolean;
}

export const colaboradorService = {
  async list(nomeBusca?: string): Promise<Colaborador[]> {
    await assertRole(["admin", "gestor"], "listar colaboradores");
    let list: Colaborador[] = [];
    if (isFirebaseConfigured()) {
      try {
        const q = query(
          getColaboradoresCollection(),
          orderBy("nome", "asc")
        );
        const fetchList = (): Promise<Colaborador[]> =>
          getDocs(q).then((snapshot) =>
            snapshot.docs.map(mapSnapshotToColaborador)
          );
        const timeoutList = (): Promise<Colaborador[]> =>
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("list_timeout")),
              LIST_TIMEOUT_MS
            )
          );
        list = await Promise.race([fetchList(), timeoutList()]);
      } catch {
        list = [];
      }
    }
    const local = getLocalColaboradores();
    const firebaseCpfs = new Set(list.map((c) => normalizeCpf(c.cpf)));
    const merged = [...list];
    for (const c of local) {
      const cpfNorm = normalizeCpf(c.cpf);
      if (firebaseCpfs.has(cpfNorm)) continue;
      if (merged.some((m) => m.id === c.id)) continue;
      if (merged.some((m) => normalizeCpf(m.cpf) === cpfNorm)) continue;
      merged.push(c);
      firebaseCpfs.add(cpfNorm);
    }
    const byCpf = new Map<string, Colaborador>();
    for (const c of merged) {
      const key = normalizeCpf(c.cpf);
      const existing = byCpf.get(key);
      if (!existing) {
        byCpf.set(key, c);
      } else if (c.id.startsWith("local-") && !existing.id.startsWith("local-")) {
        continue;
      } else {
        byCpf.set(key, c);
      }
    }
    const deduped = Array.from(byCpf.values());
    deduped.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    if (nomeBusca?.trim()) {
      const term = nomeBusca.trim().toLowerCase();
      return deduped.filter(
        (c) =>
          c.nome.toLowerCase().includes(term) ||
          c.cpf.replace(/\D/g, "").includes(term.replace(/\D/g, "")) ||
          c.cargo.toLowerCase().includes(term) ||
          c.setor.toLowerCase().includes(term)
      );
    }
    return deduped;
  },

  async getById(id: string): Promise<Colaborador | null> {
    await assertRole(["admin", "gestor"], "consultar colaborador");
    if (!isFirebaseConfigured()) return null;
    const docRef = doc(getColaboradoresCollection(), id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return mapSnapshotToColaborador(snap as QueryDocumentSnapshot<DocumentData>);
  },

  async create(data: ColaboradorFormData): Promise<CreateColaboradorResult> {
    await assertRole(["admin", "gestor"], "criar colaborador");
    validateRequiredString(data.nome, "Nome", 2, 120);
    validateRequiredString(data.cpf, "CPF", 11, 20);

    const newColab: Colaborador = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      nome: data.nome.trim(),
      cpf: data.cpf.trim(),
      cargo: data.cargo.trim(),
      setor: data.setor.trim(),
      email: data.email?.trim(),
      telefone: data.telefone?.trim(),
      admissao: data.admissao,
    };

    // Sem Firebase configurado: salva só no localStorage e retorna na hora
    if (!isFirebaseConfigured()) {
      saveLocalColaborador(newColab);
      return { id: newColab.id, savedLocally: true };
    }

    const firestoreCreate = (): Promise<string> => {
      const payload = {
        ownerUid: auth.currentUser?.uid ?? "unknown",
        nome: newColab.nome,
        cpf: newColab.cpf,
        cargo: newColab.cargo,
        setor: newColab.setor,
        email: newColab.email ?? null,
        telefone: newColab.telefone ?? null,
        admissao: data.admissao ? Timestamp.fromDate(data.admissao) : null,
        criadoEm: Timestamp.now(),
        atualizadoEm: Timestamp.now(),
      };
      return addDoc(getColaboradoresCollection(), payload).then((docRef) => docRef.id);
    };

    try {
      const id = await Promise.race([
        firestoreCreate(),
        timeoutPromise<string>(CREATE_TIMEOUT_MS, "timeout"),
      ]);
      return { id };
    } catch (err) {
      const isTimeout = err instanceof Error && err.message === "timeout";
      // Timeout ou rede: salva localmente para não perder dados
      if (isTimeout) {
        saveLocalColaborador(newColab);
        return { id: newColab.id, savedLocally: true };
      }
      // Outros erros (ex.: permissão): fallback local para não perder dados
      saveLocalColaborador(newColab);
      return { id: newColab.id, savedLocally: true };
    }
  },

  async update(id: string, data: Partial<ColaboradorFormData>): Promise<void> {
    await assertRole(["admin", "gestor"], "atualizar colaborador");
    if (id.startsWith("local-")) {
      const local = getLocalColaboradores();
      const item = local.find((c) => c.id === id);
      if (item) {
        if (data.nome !== undefined) item.nome = data.nome.trim();
        if (data.cpf !== undefined) item.cpf = data.cpf.trim();
        if (data.cargo !== undefined) item.cargo = data.cargo.trim();
        if (data.setor !== undefined) item.setor = data.setor.trim();
        if (data.email !== undefined) item.email = data.email?.trim();
        if (data.telefone !== undefined) item.telefone = data.telefone?.trim();
        if (data.admissao !== undefined) item.admissao = data.admissao;
        saveLocalColaborador(item);
      }
      return;
    }
    const docRef = doc(getColaboradoresCollection(), id);
    const payload: Record<string, unknown> = {
      atualizadoEm: Timestamp.now(),
    };
    if (data.nome !== undefined) payload.nome = data.nome.trim();
    if (data.cpf !== undefined) payload.cpf = data.cpf.trim();
    if (data.cargo !== undefined) payload.cargo = data.cargo.trim();
    if (data.setor !== undefined) payload.setor = data.setor.trim();
    if (data.email !== undefined) payload.email = data.email?.trim() || null;
    if (data.telefone !== undefined)
      payload.telefone = data.telefone?.trim() || null;
    if (data.admissao !== undefined)
      payload.admissao = data.admissao ? Timestamp.fromDate(data.admissao) : null;
    await updateDoc(docRef, payload);
  },

  async delete(id: string): Promise<void> {
    await assertRole(["admin", "gestor"], "deletar colaborador");
    if (id.startsWith("local-")) {
      removeLocalColaborador(id);
      return;
    }
    const docRef = doc(getColaboradoresCollection(), id);
    await deleteDoc(docRef);
  },
};
