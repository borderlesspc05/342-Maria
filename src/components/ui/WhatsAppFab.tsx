import { FaWhatsapp } from "react-icons/fa";
import {
  buildWhatsAppUrl,
  getDefaultSupportMessage,
  getSupportWhatsAppLabel,
  isWhatsAppConfigured,
} from "../../utils/whatsapp";
import "./WhatsAppFab.css";

export function WhatsAppFab() {
  if (!isWhatsAppConfigured()) return null;

  const url = buildWhatsAppUrl(getDefaultSupportMessage());
  const label = getSupportWhatsAppLabel();

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-fab"
      aria-label={`Falar com ${label} no WhatsApp`}
      title={`Falar com ${label}`}
    >
      <FaWhatsapp />
      <span className="whatsapp-fab-label">{label}</span>
    </a>
  );
}
