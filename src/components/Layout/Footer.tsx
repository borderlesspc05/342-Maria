import { WhatsAppButton } from "../ui/WhatsAppButton";
import { buildSupportMessage } from "../../utils/whatsapp";
import "./Footer.css";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <p className="app-footer-copy">
        © {year} Sistema de Gestão RH. Todos os direitos reservados.
      </p>
      <WhatsAppButton
        variant="link"
        label="Falar com suporte no WhatsApp"
        message={buildSupportMessage()}
        className="app-footer-whatsapp"
      />
    </footer>
  );
}
