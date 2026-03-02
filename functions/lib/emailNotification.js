/**
 * Envio de notificações por e-mail via Resend.
 * Disparado automaticamente quando uma notificação é criada no Firestore.
 */
import { Resend } from "resend";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
const NOTIFICACOES_COLLECTION = "notificacoes";
const CONFIGURACOES_COLLECTION = "configuracoes_notificacoes";
const APP_NAME = "Sistema de Gestão RH";
function getResendClient() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || typeof apiKey !== "string" || apiKey.trim() === "") {
        return null;
    }
    return new Resend(apiKey);
}
function getFromEmail() {
    const from = process.env.EMAIL_FROM;
    if (from && typeof from === "string" && from.trim() !== "") {
        return from.trim();
    }
    return `${APP_NAME} <onboarding@resend.dev>`;
}
function shouldSendEmailForTipo(tipo, config) {
    if (!config.emailNotificacoes)
        return false;
    switch (tipo) {
        case "documento_vencendo":
            return config.emailDocumentoVencendo === true;
        case "documento_vencido":
            return config.emailDocumentoVencido === true;
        case "premio_lancado":
            return config.emailPremioLancado === true;
        case "boletim_pendente":
        case "boletim_vencendo":
            return config.emailBoletimPendente === true;
        case "sistema":
        case "outro":
            return true;
        default:
            return false;
    }
}
function buildEmailHtml(titulo, mensagem, link, baseUrl) {
    const href = link ? (baseUrl && !link.startsWith("http") ? `${baseUrl.replace(/\/$/, "")}${link.startsWith("/") ? link : `/${link}`}` : link) : undefined;
    const ctaHtml = href
        ? `
    <p style="margin: 24px 0 0 0;">
      <a href="${escapeHtml(href)}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">
        Ver no sistema
      </a>
    </p>
  `
        : "";
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(titulo)}</title>
</head>
<body style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f1f5f9; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); overflow: hidden;">
    <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 24px; color: #ffffff;">
      <h1 style="margin: 0; font-size: 20px; font-weight: 700;">${escapeHtml(APP_NAME)}</h1>
      <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Notificação</p>
    </div>
    <div style="padding: 24px;">
      <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #1e293b;">${escapeHtml(titulo)}</h2>
      <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #475569;">${escapeHtml(mensagem)}</p>
      ${ctaHtml}
    </div>
    <div style="padding: 16px 24px; background: #f8fafc; font-size: 12px; color: #64748b;">
      Esta é uma mensagem automática. Não responda a este e-mail.
    </div>
  </div>
</body>
</html>
  `.trim();
}
function escapeHtml(s) {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
/**
 * Obtém o e-mail do usuário a partir do Firebase Auth.
 */
async function getUserEmail(userId) {
    try {
        const auth = getAuth();
        const user = await auth.getUser(userId);
        return user.email ?? null;
    }
    catch {
        return null;
    }
}
/**
 * Obtém as configurações de notificação do usuário.
 */
async function getConfig(userId) {
    try {
        const db = getFirestore();
        const docRef = db.collection(CONFIGURACOES_COLLECTION).doc(userId);
        const snap = await docRef.get();
        if (!snap.exists)
            return null;
        return snap.data();
    }
    catch {
        return null;
    }
}
/**
 * Envia um e-mail de notificação e atualiza o documento com emailEnviado.
 */
export const onNotificacaoCriada = onDocumentCreated({
    document: `${NOTIFICACOES_COLLECTION}/{notificacaoId}`,
    region: "us-central1",
}, async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return;
    const data = snapshot.data();
    const notificacaoId = event.params.notificacaoId;
    const userId = data?.userId;
    const tipo = data?.tipo;
    const titulo = data?.titulo ?? "Notificação";
    const mensagem = data?.mensagem ?? "";
    const link = data?.link;
    const emailEnviado = data?.emailEnviado === true;
    if (!userId || !tipo || emailEnviado) {
        return;
    }
    const resend = getResendClient();
    if (!resend) {
        console.warn("RESEND_API_KEY não configurada; e-mail não enviado.");
        return;
    }
    const config = await getConfig(userId);
    if (!config || !shouldSendEmailForTipo(tipo, config)) {
        return;
    }
    const to = await getUserEmail(userId);
    if (!to) {
        console.warn(`Usuário ${userId} sem e-mail no Auth; notificação ${notificacaoId} não enviada por e-mail.`);
        return;
    }
    const baseUrl = process.env.APP_URL?.trim() || "";
    try {
        const from = getFromEmail();
        const html = buildEmailHtml(titulo, mensagem, link, baseUrl);
        const { error } = await resend.emails.send({
            from,
            to: [to],
            subject: `[${APP_NAME}] ${titulo}`,
            html,
        });
        if (error) {
            console.error("Resend error:", error);
            return;
        }
        const db = getFirestore();
        await db.collection(NOTIFICACOES_COLLECTION).doc(notificacaoId).update({
            emailEnviado: true,
            dataEmailEnviado: FieldValue.serverTimestamp(),
        });
    }
    catch (err) {
        console.error("Erro ao enviar e-mail de notificação:", err);
    }
});
/**
 * Callable: envia um e-mail de teste para o usuário autenticado.
 */
export const sendTestEmail = onCall({ region: "us-central1" }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "É necessário estar logado para enviar e-mail de teste.");
    }
    const resend = getResendClient();
    if (!resend) {
        throw new HttpsError("failed-precondition", "Envio de e-mail não está configurado (RESEND_API_KEY). Entre em contato com o administrador.");
    }
    const to = request.auth.token.email ?? null;
    if (!to) {
        throw new HttpsError("failed-precondition", "Sua conta não possui e-mail. Não é possível enviar o e-mail de teste.");
    }
    const titulo = "E-mail de teste";
    const mensagem = "Este é um e-mail de teste do sistema de notificações. Se você recebeu esta mensagem, as notificações por e-mail estão configuradas corretamente.";
    const appUrl = process.env.APP_URL || "";
    const link = appUrl ? `${appUrl.replace(/\/$/, "")}/notificacoes` : undefined;
    const baseUrl = process.env.APP_URL?.trim() || "";
    try {
        const from = getFromEmail();
        const html = buildEmailHtml(titulo, mensagem, link, baseUrl);
        const { error } = await resend.emails.send({
            from,
            to: [to],
            subject: `[${APP_NAME}] ${titulo}`,
            html,
        });
        if (error) {
            console.error("Resend error (test):", error);
            throw new HttpsError("internal", "Falha ao enviar e-mail de teste. Tente novamente.");
        }
        return { success: true, message: "E-mail de teste enviado com sucesso." };
    }
    catch (err) {
        if (err instanceof HttpsError)
            throw err;
        console.error("Erro ao enviar e-mail de teste:", err);
        throw new HttpsError("internal", "Erro ao enviar e-mail de teste.");
    }
});
