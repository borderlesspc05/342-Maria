import * as functions from "firebase-functions/v1";
/**
 * Cria usuário via Admin SDK sem trocar a sessão do admin.
 */
export declare const createUserByAdmin: functions.HttpsFunction & functions.Runnable<any>;
/**
 * Remove usuário do Auth e Firestore.
 */
export declare const deleteUserByAdmin: functions.HttpsFunction & functions.Runnable<any>;
/**
 * Bootstrap do primeiro admin (sem usuário logado).
 * Protegido por variável de ambiente ADMIN_BOOTSTRAP_SECRET.
 */
export declare const bootstrapAdmin: functions.HttpsFunction & functions.Runnable<any>;
