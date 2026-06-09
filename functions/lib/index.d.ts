import * as functions from "firebase-functions/v1";
/**
 * Agendado: executa todo dia às 03:00 (America/Sao_Paulo).
 * 1ª geração = compatível com plano Spark (grátis).
 */
export declare const scheduledBackup: functions.CloudFunction<unknown>;
/**
 * Acionável pelo app: "Fazer backup agora". Exige autenticação.
 * 1ª geração = compatível com plano Spark (grátis).
 */
export declare const runBackupNow: functions.HttpsFunction & functions.Runnable<any>;
export { createUserByAdmin, deleteUserByAdmin, bootstrapAdmin, } from "./userManagement.js";
