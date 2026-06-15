export function getSupportWhatsAppPhone(): string {
  return (import.meta.env.VITE_SUPPORT_WHATSAPP ?? "").replace(/\D/g, "");
}

export function getSupportWhatsAppLabel(): string {
  return import.meta.env.VITE_SUPPORT_WHATSAPP_LABEL ?? "Suporte RH";
}

export function getDefaultSupportMessage(): string {
  return (
    import.meta.env.VITE_SUPPORT_WHATSAPP_DEFAULT_MESSAGE ??
    "Olá! Preciso de ajuda com o Sistema de Gestão RH."
  );
}

export function isWhatsAppConfigured(phone?: string): boolean {
  const digits = (phone ?? getSupportWhatsAppPhone()).replace(/\D/g, "");
  return digits.length >= 10;
}

export function buildWhatsAppUrl(message?: string, phone?: string): string {
  const digits = (phone ?? getSupportWhatsAppPhone()).replace(/\D/g, "");
  if (!digits) return "";

  const base = `https://wa.me/${digits}`;
  if (!message?.trim()) return base;
  return `${base}?text=${encodeURIComponent(message.trim())}`;
}

export function openWhatsApp(message?: string, phone?: string): void {
  const url = buildWhatsAppUrl(message, phone);
  if (url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export function buildSupportMessage(context?: string): string {
  const base = getDefaultSupportMessage();
  if (!context?.trim()) return base;
  return `${base}\n\n${context.trim()}`;
}

export function phoneToWhatsAppDigits(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.length >= 10 && digits.length <= 11 && !digits.startsWith("55")) {
    digits = `55${digits}`;
  }
  return digits;
}
