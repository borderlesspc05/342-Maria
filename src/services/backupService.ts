import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebaseconfig";
import type { BackupConfig, BackupPeriodicity, BackupListItem } from "../types/backup";

const CONFIG_COLLECTION = "config";
const CONFIG_BACKUP_DOC = "backup";
const BACKUPS_COLLECTION = "backups";

const BACKUP_COLLECTION_NAMES = [
  "premiosProdutividade",
  "boletinsMedicao",
  "lancamentosDiarios",
  "documentacoes",
  "treinamentos",
  "colaboradores",
] as const;

/** Tamanho por chunk (~900 KB) para respeitar limite do Firestore. */
const CHUNK_SIZE = 900_000;

function configDocRef() {
  return doc(db, CONFIG_COLLECTION, CONFIG_BACKUP_DOC);
}

function parseTimestamp(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

function serializeDoc(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === "object" && "toDate" in v && typeof (v as { toDate: () => Date }).toDate === "function") {
      out[k] = (v as { toDate: () => Date }).toDate().toISOString();
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = serializeDoc(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export const backupService = {
  async getBackupConfig(): Promise<BackupConfig> {
    const snap = await getDoc(configDocRef());
    const data = snap.data();
    if (!data) {
      return { periodicity: "daily" };
    }
    return {
      periodicity: (data.periodicity as BackupPeriodicity) ?? "daily",
      lastRunAt: parseTimestamp(data.lastRunAt),
      lastBackupId: data.lastBackupId ?? null,
      lastBackupFilename: data.lastBackupFilename ?? null,
    };
  },

  async setBackupPeriodicity(periodicity: BackupPeriodicity): Promise<void> {
    await setDoc(configDocRef(), { periodicity }, { merge: true });
  },

  /**
   * Executa o backup no cliente (sem Cloud Function).
   * Lê as coleções do Firestore, monta o JSON, grava em backups + chunks e dispara o download.
   * Funciona no plano Spark (sem Blaze).
   */
  async runBackupNow(): Promise<{ backupId: string; filename: string; timestamp: string }> {
    const timestamp = new Date();
    const timestampStr = timestamp.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const backupId = `backup-${timestampStr}`;
    const filename = `${backupId}.json`;

    const payload: Record<string, unknown[]> = {
      _exportedAt: [timestamp.toISOString()],
    };

    for (const collName of BACKUP_COLLECTION_NAMES) {
      const snapshot = await getDocs(collection(db, collName));
      const docs = snapshot.docs.map((d) => ({
        id: d.id,
        ...serializeDoc(d.data() as Record<string, unknown>),
      }));
      payload[collName] = docs;
    }

    const json = JSON.stringify(payload, null, 0);
    const dataSize = json.length;
    const chunks: string[] = [];
    for (let i = 0; i < json.length; i += CHUNK_SIZE) {
      chunks.push(json.slice(i, i + CHUNK_SIZE));
    }
    const chunkCount = chunks.length;

    const backupRef = doc(db, BACKUPS_COLLECTION, backupId);
    const batch = writeBatch(db);
    batch.set(backupRef, {
      filename,
      createdAt: serverTimestamp(),
      dataSize,
      chunkCount,
    });
    for (let i = 0; i < chunks.length; i++) {
      batch.set(doc(db, BACKUPS_COLLECTION, backupId, "chunks", String(i)), { content: chunks[i] });
    }
    await batch.commit();

    await setDoc(
      configDocRef(),
      {
        lastRunAt: serverTimestamp(),
        lastBackupId: backupId,
        lastBackupFilename: filename,
      },
      { merge: true }
    );

    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    return { backupId, filename, timestamp: timestamp.toISOString() };
  },

  /** Lista os últimos backups (coleção Firestore `backups`). */
  async listBackups(): Promise<BackupListItem[]> {
    const backupsRef = collection(db, BACKUPS_COLLECTION);
    const q = query(backupsRef, orderBy("createdAt", "desc"), limit(20));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => {
      const data = d.data();
      const createdAt = data.createdAt?.toDate?.() ?? new Date(0);
      return {
        id: d.id,
        name: (data.filename as string) || d.id,
        createdAt: createdAt.getTime(),
        dataSize: data.dataSize as number | undefined,
      };
    });
  },

  /** Baixa um backup (lê chunks no Firestore e dispara download). */
  async downloadBackup(backupId: string, filename: string): Promise<void> {
    const backupRef = doc(db, BACKUPS_COLLECTION, backupId);
    const backupSnap = await getDoc(backupRef);
    if (!backupSnap.exists()) {
      throw new Error("Backup não encontrado.");
    }
    const data = backupSnap.data();
    const chunkCount = (data?.chunkCount as number) ?? 0;
    if (chunkCount <= 0) return;

    const chunksRef = collection(db, BACKUPS_COLLECTION, backupId, "chunks");
    const chunksSnap = await getDocs(chunksRef);
    const parts = chunksSnap.docs
      .sort((a, b) => Number(a.id) - Number(b.id))
      .map((d) => (d.data().content as string) ?? "");
    const json = parts.join("");

    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `${backupId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
