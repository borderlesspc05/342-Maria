import "./Perfil.css";
import { useAuth } from "../../hooks/useAuth";
import Layout from "../../components/Layout/Layout";
import { HiUser, HiMail } from "react-icons/hi";

export default function Perfil() {
  const { user } = useAuth();

  return (
    <Layout>
      <div className="perfil-container">
        <h2 className="perfil-title">Meu Perfil</h2>

        <div className="perfil-card">
          <div className="perfil-avatar">
            {user?.profileImageUrl ? (
              <img src={user.profileImageUrl} alt="Imagem de perfil" />
            ) : (
              <HiUser />
            )}
          </div>

          <div className="perfil-info">
            <div className="perfil-item">
              <span className="label">
                <HiUser /> Nome
              </span>
              <span className="value">{user?.name}</span>
            </div>

            <div className="perfil-item">
              <span className="label">
                <HiMail /> Email
              </span>
              <span className="value">{user?.email}</span>
            </div>

            <div className="perfil-item">
              <span className="label">Perfil</span>
              <span className="value">
                {user?.role === "admin"
                  ? "Administrador"
                  : user?.role === "gestor"
                  ? "Gestor"
                  : "Colaborador"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
