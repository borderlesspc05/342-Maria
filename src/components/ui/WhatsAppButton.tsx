import { FaWhatsapp } from "react-icons/fa";
import type { MouseEvent } from "react";
import {
  buildWhatsAppUrl,
  getSupportWhatsAppLabel,
  isWhatsAppConfigured,
} from "../../utils/whatsapp";
import "./WhatsAppButton.css";

interface WhatsAppButtonProps {
  message?: string;
  phone?: string;
  label?: string;
  variant?: "button" | "link" | "icon";
  className?: string;
  onClick?: (e: MouseEvent) => void;
}

export function WhatsAppButton({
  message,
  phone,
  label,
  variant = "button",
  className = "",
  onClick,
}: WhatsAppButtonProps) {
  if (!isWhatsAppConfigured(phone)) return null;

  const url = buildWhatsAppUrl(message, phone);
  const text = label ?? getSupportWhatsAppLabel();

  if (variant === "icon") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`whatsapp-btn whatsapp-btn--icon ${className}`}
        title={text}
        aria-label={`Abrir WhatsApp: ${text}`}
        onClick={onClick}
      >
        <FaWhatsapp />
      </a>
    );
  }

  if (variant === "link") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`whatsapp-btn whatsapp-btn--link ${className}`}
        onClick={onClick}
      >
        <FaWhatsapp />
        {text}
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`whatsapp-btn whatsapp-btn--button ${className}`}
      onClick={onClick}
    >
      <FaWhatsapp />
      {text}
    </a>
  );
}
