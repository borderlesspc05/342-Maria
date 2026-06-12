import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createAdminUser } from "../../utils/createAdminUser";
import { paths } from "../../routes/paths";
import "./SetupAdmin.css";

const SetupAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleCreateAdmin = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await createAdminUser();
      setMessage(
        "Administrador criado com sucesso. Faça login para continuar."
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao criar usuário admin";
      setError(msg);
      console.error("Erro:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="setup-container">
      <div className="setup-card">
        <h1>Setup inicial</h1>
        <p className="setup-description">
          Use esta tela apenas na primeira instalação do sistema para criar o
          administrador principal.
        </p>

        <div className="setup-info">
          <h3>Antes de continuar</h3>
          <ul>
            <li>Execute somente uma vez por ambiente.</li>
            <li>Após criar o admin, faça login normalmente.</li>
            <li>Em produção, desative esta rota (sem VITE_ALLOW_SETUP).</li>
          </ul>
        </div>

        {message && (
          <div className="setup-message success">
            <pre>{message}</pre>
          </div>
        )}

        {error && (
          <div className="setup-message error">
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
              {error}
            </pre>
          </div>
        )}

        <div className="setup-actions">
          <button
            onClick={handleCreateAdmin}
            disabled={loading}
            className="setup-button"
          >
            {loading ? "Criando..." : "Criar administrador"}
          </button>

          <button
            onClick={() => navigate(paths.login)}
            className="setup-button secondary"
          >
            Ir para login
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupAdmin;
