/**
 * Agendado: executa todo dia às 03:00 (America/Sao_Paulo).
 * Se config/backup tiver periodicity === "weekly", só roda aos domingos.
 */
export declare const scheduledBackup: import("firebase-functions/v2/scheduler").ScheduleFunction;
/**
 * Acionável pelo app: "Fazer backup agora". Exige autenticação.
 */
export declare const runBackupNow: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    backupId: string;
    filename: string;
    timestamp: string;
}>, unknown>;
