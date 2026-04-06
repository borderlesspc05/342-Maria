import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../lib/firebaseconfig";
import { functions } from "../lib/firebaseconfig";
import { httpsCallable } from "firebase/functions";
import type { BackupConfig, BackupPeriodicity, BackupListItem } from "../types/backup";
import { assertRole } from "./securityService";

const CONFIG_COLLECTION = "config";
const CONFIG_BACKUP_DOC = "backup";
const BACKUPS_COLLECTION = "backups";

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

export const backupService = {
  async getBackupConfig(): Promise<BackupConfig> {
    await assertRole(["admin"], "consultar configuração de backup");
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
    await assertRole(["admin"], "alterar periodicidade de backup");
    await setDoc(configDocRef(), { periodicity }, { merge: true });
  },

  async runBackupNow(): Promise<{ backupId: string; filename: string; timestamp: string }> {
    await assertRole(["admin"], "executar backup manual");
    const callable = httpsCallable(functions, "runBackupNow");
    const result = await callable();
    return result.data as { backupId: string; filename: string; timestamp: string };
  },

  /** Lista os últimos backups (coleção Firestore `backups`). */
  async listBackups(): Promise<BackupListItem[]> {
    await assertRole(["admin"], "listar backups");
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
    await assertRole(["admin"], "baixar backups");
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
