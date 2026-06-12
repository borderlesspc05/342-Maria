import { Link } from "react-router-dom";
import { HiHome, HiExclamationCircle } from "react-icons/hi";
import { Layout } from "../../components/Layout";
import { paths } from "../../routes/paths";
import "./NotFound.css";

export default function NotFound() {
  return (
    <Layout>
      <div className="not-found-page">
        <div className="not-found-card">
          <HiExclamationCircle className="not-found-icon" aria-hidden="true" />
          <h1>Página não encontrada</h1>
          <p>
            O endereço que você acessou não existe ou foi movido. Volte ao
            painel para continuar.
          </p>
          <Link to={paths.dashboard} className="not-found-btn">
            <HiHome />
            Ir para o painel
          </Link>
        </div>
      </div>
    </Layout>
  );
}
