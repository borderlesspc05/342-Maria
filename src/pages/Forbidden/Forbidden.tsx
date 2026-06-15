import { Link } from "react-router-dom";
import { HiShieldExclamation, HiArrowLeft } from "react-icons/hi";
import { Layout } from "../../components/Layout";
import { WhatsAppButton } from "../../components/ui/WhatsAppButton";
import { buildSupportMessage } from "../../utils/whatsapp";
import { paths } from "../../routes/paths";
import "./Forbidden.css";

export default function Forbidden() {
  return (
    <Layout>
      <div className="forbidden-page">
        <div className="forbidden-card">
          <div className="forbidden-icon" aria-hidden="true">
            <HiShieldExclamation />
          </div>
          <h1>Acesso restrito</h1>
          <p>
            Você não tem permissão para acessar esta área. Se acredita que isso
            é um erro, fale com o administrador do sistema.
          </p>
          <Link to={paths.dashboard} className="forbidden-btn">
            <HiArrowLeft />
            Voltar ao painel
          </Link>
          <WhatsAppButton
            variant="button"
            label="Falar com suporte no WhatsApp"
            message={buildSupportMessage(
              "Não consigo acessar uma área do sistema e preciso de ajuda."
            )}
            className="forbidden-whatsapp"
          />
        </div>
      </div>
    </Layout>
  );
}
