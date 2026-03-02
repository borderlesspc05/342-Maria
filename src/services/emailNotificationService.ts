/**
 * Serviço de notificações por e-mail via EmailJS (sem Cloud Functions).
 * Funciona no plano Firebase Spark (grátis).
 */

import emailjs from "@emailjs/browser";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebaseconfig";
import type { Notificacao, ConfiguracaoNotificacao } from "../types/notificacao";
import type { TipoNotificacao } from "../types/notificacao";

const NOTIFICACOES_COLLECTION = "notificacoes";
const CONFIGURACOES_COLLECTION = "configuracoes_notificacoes";

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID ?? "";
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID ?? "";
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY ?? "";

const APP_NAME = "Sistema de Gestão RH";

function isEmailJsConfigured(): boolean {
  return Boolean(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY);
}

function shouldSendForTipo(
  tipo: TipoNotificacao,
  config: ConfiguracaoNotificacao
): boolean {
  if (!config.emailNotificacoes) return false;
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

async function getConfig(userId: string): Promise<ConfiguracaoNotificacao | null> {
  try {
    const docRef = doc(db, CONFIGURACOES_COLLECTION, userId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    const atualizadoEm = data.atualizadoEm?.toDate?.() ?? data.atualizadoEm;
    return {
      id: snap.id,
      userId: data.userId,
      userEmail: data.userEmail,
      emailNotificacoes: data.emailNotificacoes,
      emailDocumentoVencendo: data.emailDocumentoVencendo,
      emailDocumentoVencido: data.emailDocumentoVencido,
      emailPremioLancado: data.emailPremioLancado,
      emailBoletimPendente: data.emailBoletimPendente,
      diasAntesVencimento: data.diasAntesVencimento,
      horaVerificacao: data.horaVerificacao,
      atualizadoEm: atualizadoEm ? new Date(atualizadoEm) : new Date(),
    } as ConfiguracaoNotificacao;
  } catch {
    return null;
  }
}

async function sendViaEmailJs(params: {
  to_email: string;
  subject: string;
  message: string;
  link?: string;
}): Promise<void> {
  if (!isEmailJsConfigured()) {
    throw new Error(
      "E-mail não configurado. Defina VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID e VITE_EMAILJS_PUBLIC_KEY no .env."
    );
  }
  await emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    {
      to_email: params.to_email,
      subject: params.subject,
      message: params.message,
      app_name: APP_NAME,
      link: params.link ?? "",
    },
    { publicKey: PUBLIC_KEY }
  );
}

async function markEmailSent(notificacaoId: string): Promise<void> {
  try {
    const docRef = doc(db, NOTIFICACOES_COLLECTION, notificacaoId);
    await updateDoc(docRef, {
      emailEnviado: true,
      dataEmailEnviado: Timestamp.now(),
    });
  } catch (e) {
    console.warn("Não foi possível marcar emailEnviado:", e);
  }
}

export interface SendTestEmailResult {
  success: boolean;
  message: string;
}

export const emailNotificationService = {
  isConfigured(): boolean {
    return isEmailJsConfigured();
  },

  /**
   * Envia e-mail para a notificação se a configuração do usuário permitir.
   * Chamado após criar uma notificação (fire-and-forget no cliente).
   */
  async sendForNotificationIfEnabled(
    notificacao: Notificacao,
    currentUserEmail?: string | null,
    currentUserId?: string | null
  ): Promise<void> {
    if (!isEmailJsConfigured()) return;
    if (notificacao.emailEnviado) return;

    const config = await getConfig(notificacao.userId);
    if (!config || !shouldSendForTipo(notificacao.tipo, config)) return;

    const to =
      config.userEmail ||
      (currentUserId === notificacao.userId ? currentUserEmail : null);
    if (!to || typeof to !== "string" || to.trim() === "") return;

    const appUrl = (import.meta.env.VITE_APP_URL as string)?.trim() ?? "";
    const link = notificacao.link && appUrl
      ? `${appUrl.replace(/\/$/, "")}${notificacao.link.startsWith("/") ? notificacao.link : `/${notificacao.link}`}`
      : undefined;

    try {
      await sendViaEmailJs({
        to_email: to.trim(),
        subject: `[${APP_NAME}] ${notificacao.titulo}`,
        message: notificacao.mensagem,
        link,
      });
      await markEmailSent(notificacao.id);
    } catch (err) {
      console.warn("Falha ao enviar e-mail de notificação:", err);
    }
  },

  /**
   * Envia um e-mail de teste para o usuário (endereço informado).
   */
  async sendTestEmail(recipientEmail: string): Promise<SendTestEmailResult> {
    if (!isEmailJsConfigured()) {
      return {
        success: false,
        message:
          "E-mail não configurado. Defina VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID e VITE_EMAILJS_PUBLIC_KEY no .env.",
      };
    }
    try {
      await sendViaEmailJs({
        to_email: recipientEmail,
        subject: `[${APP_NAME}] E-mail de teste`,
        message:
          "Este é um e-mail de teste do sistema de notificações. Se você recebeu esta mensagem, as notificações por e-mail estão configuradas corretamente.",
      });
      return { success: true, message: "E-mail de teste enviado. Verifique sua caixa de entrada." };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao enviar e-mail de teste.";
      return { success: false, message: msg };
    }
  },
};
