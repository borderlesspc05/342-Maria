import "../Configuracoes/Configuracoes.css";
import "./Perfil.css";
import { useAuth } from "../../hooks/useAuth";
import Layout from "../../components/Layout/Layout";
import {
  HiUser,
  HiMail,
  HiLogout,
  HiLockClosed,
  HiPhotograph,
} from "react-icons/hi";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { ChangePasswordModal } from "../../components/ChangePasswordModal";
import { paths } from "../../routes/paths";

export default function Perfil() {
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [name, setName] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, logOut, updateProfile } = useAuth();

  useEffect(() => {
    setName(user?.name ?? "");
    setProfileImageUrl(user?.profileImageUrl ?? null);
    setFormMessage(null);
    setFormError(null);
  }, [user]);

  function handleLogout() {
    logOut();
    navigate(paths.login);
  }

  async function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500_000) {
      setFormError("Use uma imagem de até 500 KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProfileImageUrl(typeof reader.result === "string" ? reader.result : null);
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError("Informe um nome para o perfil.");
      setFormMessage(null);
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);
      setFormMessage(null);

      await updateProfile({
        name: trimmedName,
        profileImageUrl,
      });

      setFormMessage("Perfil atualizado com sucesso.");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Erro ao atualizar perfil."
      );
    } finally {
      setIsSaving(false);
    }
  }

  const roleLabel =
    user?.role === "admin"
      ? "Administrador"
      : user?.role === "gestor"
        ? "Gestor"
        : "Colaborador";

  return (
    <Layout>
      <div className="settings-container perfil-container">
        <h2 className="settings-title">Meu Perfil</h2>

        <div className="settings-card">
          <h3 className="settings-section-title">
            <HiUser /> Dados da conta
          </h3>

          <form className="profile-form" onSubmit={handleSaveProfile}>
            <div className="profile-image-field">
              <div className="profile-image-preview">
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt="Imagem de perfil" />
                ) : (
                  <HiPhotograph />
                )}
              </div>

              <div className="profile-image-actions">
                <label className="settings-button secondary file-button">
                  Escolher imagem
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    aria-label="Selecionar imagem de perfil"
                  />
                </label>

                <button
                  type="button"
                  className="settings-button secondary"
                  onClick={() => setProfileImageUrl(null)}
                >
                  Remover imagem
                </button>
              </div>
            </div>

            <div className="perfil-info">
              <div className="perfil-item">
                <span className="label">
                  <HiUser /> Nome
                </span>
                <input
                  className="settings-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                />
              </div>

              <div className="perfil-item">
                <span className="label">
                  <HiMail /> E-mail
                </span>
                <span className="value">{user?.email}</span>
              </div>

              <div className="perfil-item">
                <span className="label">Perfil de acesso</span>
                <span className="value">{roleLabel}</span>
              </div>
            </div>

            {formError && <p className="settings-feedback error">{formError}</p>}
            {formMessage && (
              <p className="settings-feedback success">{formMessage}</p>
            )}

            <div className="settings-actions">
              <button
                className="settings-button primary"
                type="submit"
                disabled={isSaving}
              >
                {isSaving ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </form>
        </div>

        <div className="settings-card">
          <h3 className="settings-section-title">
            <HiLockClosed /> Segurança
          </h3>

          <div className="settings-item action">
            <span className="label">Alterar senha</span>
            <button
              className="settings-button secondary"
              onClick={() => setIsChangePasswordOpen(true)}
            >
              Alterar
            </button>
          </div>

          <div className="settings-item action">
            <span className="label">Encerrar sessão</span>
            <button className="settings-button danger" onClick={handleLogout}>
              <HiLogout /> Sair
            </button>
          </div>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </Layout>
  );
}
