/**
 * Envio de notificações por e-mail via Resend.
 * Disparado automaticamente quando uma notificação é criada no Firestore.
 */
/**
 * Envia um e-mail de notificação e atualiza o documento com emailEnviado.
 */
export declare const onNotificacaoCriada: import("firebase-functions/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").QueryDocumentSnapshot | undefined, {
    notificacaoId: string;
}>>;
/**
 * Callable: envia um e-mail de teste para o usuário autenticado.
 */
export declare const sendTestEmail: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    message: string;
}>, unknown>;
