/** Periodicidade do backup agendado (config/backup). */
export type BackupPeriodicity = "daily" | "weekly";

export interface BackupConfig {
  periodicity?: BackupPeriodicity;
  lastRunAt?: string | null;
  lastBackupId?: string | null;
  lastBackupFilename?: string | null;
}

export interface BackupRunResult {
  backupId: string;
  filename: string;
  timestamp: string;
}

/** Item da lista de backups (armazenados no Firestore, sem Storage). */
export interface BackupListItem {
  id: string;
  name: string;
  createdAt: number;
  dataSize?: number;
}
