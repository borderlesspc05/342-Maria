import React, { useState, useEffect, useCallback, useMemo } from "react";
import { renderModalPortal } from "../../utils/renderModalPortal";
import {
  HiPlus,
  HiSearch,
  HiPencil,
  HiTrash,
  HiUserGroup,
  HiShieldCheck,
  HiKey,
  HiEye,
  HiEyeOff,
} from "react-icons/hi";
import { Layout } from "../../components/Layout";
import { colaboradorService } from "../../services/colaboradorService";
import {
  getCreatableRoles,
  userManagementService,
} from "../../services/userManagementService";
import type {
  ColaboradorFormData,
  CreateColaboradorResult,
} from "../../services/colaboradorService";
import type { Colaborador } from "../../types/premioProdutividade";
import type { User } from "../../types/user";
import type { UserRole } from "../../services/securityService";
import { maskCPF, unmaskCPF } from "../../utils/masks";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../hooks/useAuth";
import "./Colaboradores.css";

const LIST_LOAD_TIMEOUT_MS = 15000;

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  colaborador: "Colaborador",
};

const Colaboradores: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [teamUsers, setTeamUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingColaborador, setEditingColaborador] =
    useState<Colaborador | null>(null);

  const canManageAccess =
    currentUser?.role === "admin" || currentUser?.role === "gestor";

  const loadColaboradores = useCallback(async () => {
    setLoadError(false);
    setLoading(true);
    const timeoutId = window.setTimeout(() => {
      setLoading(false);
      setColaboradores([]);
      setLoadError(true);
    }, LIST_LOAD_TIMEOUT_MS);
    try {
      const data = await colaboradorService.list(search || undefined);
      window.clearTimeout(timeoutId);
      setColaboradores(data);
    } catch (error) {
      window.clearTimeout(timeoutId);
      console.error("Erro ao carregar colaboradores:", error);
      setColaboradores([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [search]);

  const loadTeamUsers = useCallback(async () => {
    if (!canManageAccess) return;
    try {
      const users = await userManagementService.listTeam();
      setTeamUsers(users);
    } catch (error) {
      console.error("Erro ao carregar usuários da equipe:", error);
    }
  }, [canManageAccess]);

  useEffect(() => {
    loadColaboradores();
  }, [loadColaboradores]);

  useEffect(() => {
    loadTeamUsers();
  }, [loadTeamUsers]);

  const accessByEmail = useMemo(() => {
    const map = new Map<string, UserRole>();
    teamUsers.forEach((u) => {
      if (u.email) map.set(u.email.toLowerCase(), u.role);
    });
    return map;
  }, [teamUsers]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este colaborador?")) return;
    try {
      await colaboradorService.delete(id);
      await loadColaboradores();
    } catch (error) {
      console.error("Erro ao excluir colaborador:", error);
      alert("Não foi possível excluir o colaborador.");
    }
  };

  return (
    <Layout>
      <div className="colaboradores-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Colaboradores</h1>
            <p className="page-subtitle">
              Cadastre colaboradores e, se necessário, crie o acesso ao sistema
              {currentUser?.role === "admin"
                ? " (gestor ou colaborador)"
                : currentUser?.role === "gestor"
                  ? " (colaborador)"
                  : ""}
            </p>
          </div>
          <button
            className="btn-primary"
            onClick={() => {
              setEditingColaborador(null);
              setShowModal(true);
            }}
          >
            <HiPlus />
            Novo cadastro
          </button>
        </div>

        <div className="filters-section">
          <div className="filters-header">
            <div className="search-box">
              <HiSearch />
              <input
                type="text"
                placeholder="Buscar por nome, CPF, cargo ou setor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="table-container">
          {loading ? (
            <div className="loading">Carregando colaboradores...</div>
          ) : colaboradores.length === 0 ? (
            <div className="empty-state">
              <HiUserGroup className="empty-icon" />
              <p>
                {loadError
                  ? "Não foi possível carregar a lista. Verifique sua conexão e tente novamente."
                  : search
                    ? "Nenhum colaborador encontrado para essa busca."
                    : "Nenhum colaborador cadastrado. Clique em Novo cadastro para começar."}
              </p>
            </div>
          ) : (
            <table className="colaboradores-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>Cargo</th>
                  <th>Setor</th>
                  <th>E-mail</th>
                  {canManageAccess && <th>Acesso ao sistema</th>}
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {colaboradores.map((colab) => {
                  const systemRole = colab.email
                    ? accessByEmail.get(colab.email.toLowerCase())
                    : undefined;
                  return (
                    <tr key={colab.id}>
                      <td>
                        <strong>{colab.nome}</strong>
                      </td>
                      <td>{maskCPF(colab.cpf)}</td>
                      <td>{colab.cargo}</td>
                      <td>{colab.setor}</td>
                      <td>{colab.email || "—"}</td>
                      {canManageAccess && (
                        <td>
                          {systemRole ? (
                            <span className={`access-badge ${systemRole}`}>
                              {ROLE_LABELS[systemRole]}
                            </span>
                          ) : (
                            <span className="access-badge none">Sem acesso</span>
                          )}
                        </td>
                      )}
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-icon"
                            onClick={() => {
                              setEditingColaborador(colab);
                              setShowModal(true);
                            }}
                            title="Editar"
                          >
                            <HiPencil />
                          </button>
                          <button
                            className="btn-icon btn-icon-danger"
                            onClick={() => handleDelete(colab.id)}
                            title="Excluir"
                          >
                            <HiTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {showModal && (
          <ColaboradorModal
            colaborador={editingColaborador}
            currentUserRole={currentUser?.role}
            hasSystemAccess={
              editingColaborador?.email
                ? accessByEmail.has(editingColaborador.email.toLowerCase())
                : false
            }
            onClose={() => {
              setShowModal(false);
              setEditingColaborador(null);
            }}
            onSuccess={() => {
              setShowModal(false);
              setEditingColaborador(null);
              loadColaboradores();
              loadTeamUsers();
            }}
          />
        )}
      </div>
    </Layout>
  );
};

interface ColaboradorModalProps {
  colaborador: Colaborador | null;
  currentUserRole?: UserRole;
  hasSystemAccess: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ColaboradorModal: React.FC<ColaboradorModalProps> = ({
  colaborador,
  currentUserRole,
  hasSystemAccess,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const submittedRef = React.useRef(false);
  const creatableRoles = getCreatableRoles(currentUserRole);
  const canCreateAccess = creatableRoles.length > 0 && !colaborador;

  const [formData, setFormData] = useState({
    nome: colaborador?.nome ?? "",
    cpf: maskCPF(colaborador?.cpf ?? ""),
    cargo: colaborador?.cargo ?? "",
    setor: colaborador?.setor ?? "",
    email: colaborador?.email ?? "",
    admissao:
      colaborador?.admissao != null
        ? new Date(colaborador.admissao).toISOString().split("T")[0]
        : "",
  });

  const [criarAcesso, setCriarAcesso] = useState(canCreateAccess);
  const [systemRole, setSystemRole] = useState<UserRole>(
    creatableRoles[0] ?? "colaborador"
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (colaborador) {
      setFormData({
        nome: colaborador.nome,
        cpf: maskCPF(colaborador.cpf),
        cargo: colaborador.cargo,
        setor: colaborador.setor,
        email: colaborador.email ?? "",
        admissao:
          colaborador.admissao != null
            ? new Date(colaborador.admissao).toISOString().split("T")[0]
            : "",
      });
      setCriarAcesso(false);
    } else {
      setFormData({
        nome: "",
        cpf: "",
        cargo: "",
        setor: "",
        email: "",
        admissao: "",
      });
      setCriarAcesso(canCreateAccess);
      setSystemRole(creatableRoles[0] ?? "colaborador");
      setPassword("");
      setConfirmPassword("");
    }
  }, [colaborador, canCreateAccess, creatableRoles]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "cpf") {
      setFormData((prev) => ({ ...prev, cpf: maskCPF(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const validateAccessFields = (): string | null => {
    if (!criarAcesso) return null;
    if (!formData.email.trim()) {
      return "Informe o e-mail para criar o acesso ao sistema.";
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      return "E-mail inválido.";
    }
    if (!password) return "Informe uma senha para o acesso.";
    if (password.length < 6) {
      return "A senha deve ter no mínimo 6 caracteres.";
    }
    if (!/[A-Z]/.test(password)) {
      return "A senha deve conter pelo menos 1 letra maiúscula.";
    }
    if (password !== confirmPassword) {
      return "As senhas não coincidem.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittedRef.current) return;

    const accessError = validateAccessFields();
    if (accessError) {
      showToast(accessError, "error");
      return;
    }

    submittedRef.current = true;
    setSaving(true);
    try {
      const data: ColaboradorFormData = {
        nome: formData.nome.trim(),
        cpf: unmaskCPF(formData.cpf),
        cargo: formData.cargo.trim(),
        setor: formData.setor.trim(),
        email: formData.email.trim() || undefined,
        admissao: formData.admissao ? new Date(formData.admissao) : undefined,
      };

      if (colaborador) {
        await colaboradorService.update(colaborador.id, data);
        showToast("Colaborador atualizado com sucesso!");
      } else {
        const result: CreateColaboradorResult =
          await colaboradorService.create(data);

        if (criarAcesso && formData.email.trim()) {
          await userManagementService.create({
            name: data.nome,
            email: formData.email.trim(),
            password,
            confirmPassword,
            role: systemRole,
          });
          showToast(
            result.savedLocally
              ? "Colaborador salvo localmente e conta de acesso criada!"
              : `Cadastro e acesso como ${ROLE_LABELS[systemRole]} criados com sucesso!`
          );
        } else if (result.savedLocally) {
          showToast(
            "Colaborador salvo localmente. Será sincronizado quando a conexão estiver disponível.",
            "info"
          );
        } else {
          showToast("Colaborador cadastrado com sucesso!");
        }
      }

      onSuccess();
    } catch (error) {
      console.error("Erro ao salvar colaborador:", error);
      submittedRef.current = false;
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível salvar. Verifique os dados e tente novamente.";
      showToast(message, "error");
    } finally {
      setSaving(false);
      submittedRef.current = false;
    }
  };

  const modalContent = (
    <div className="colaboradores-page">
      <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content ${canCreateAccess ? "modal-content-wide" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2>{colaborador ? "Editar colaborador" : "Novo cadastro"}</h2>
            {!colaborador && canCreateAccess && (
              <p className="modal-subtitle">
                Preencha os dados e opcionalmente crie o login no sistema
              </p>
            )}
          </div>
          <button type="button" className="btn-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <section className="form-section">
            <div className="form-section-title">
              <HiUserGroup />
              <span>Dados cadastrais</span>
            </div>

            <div className="form-row">
              <div className="form-group full-width">
                <label>Nome *</label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  required
                  placeholder="Nome completo"
                />
              </div>
            </div>

            <div className="form-row form-row-3">
              <div className="form-group">
                <label>CPF *</label>
                <input
                  type="text"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleChange}
                  required
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>
              <div className="form-group">
                <label>Cargo *</label>
                <input
                  type="text"
                  name="cargo"
                  value={formData.cargo}
                  onChange={handleChange}
                  required
                  placeholder="Ex.: Analista"
                />
              </div>
              <div className="form-group">
                <label>Setor *</label>
                <input
                  type="text"
                  name="setor"
                  value={formData.setor}
                  onChange={handleChange}
                  required
                  placeholder="Ex.: Operações"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>E-mail {criarAcesso ? "*" : ""}</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required={criarAcesso}
                  placeholder="email@empresa.com"
                />
              </div>
              <div className="form-group">
                <label>Data de admissão</label>
                <input
                  type="date"
                  name="admissao"
                  value={formData.admissao}
                  onChange={handleChange}
                />
              </div>
            </div>
          </section>

          {canCreateAccess && (
            <section className="form-section form-section-access">
              <div className="form-section-header">
                <div className="form-section-title">
                  <HiKey />
                  <span>Acesso ao sistema</span>
                </div>
                <label className="access-toggle">
                  <input
                    type="checkbox"
                    checked={criarAcesso}
                    onChange={(e) => setCriarAcesso(e.target.checked)}
                  />
                  <span className="access-toggle-slider" />
                  <span className="access-toggle-label">Criar login</span>
                </label>
              </div>

              {criarAcesso ? (
                <>
                  <p className="form-section-hint">
                    {currentUserRole === "admin"
                      ? "Como administrador, você pode criar contas de Gestor ou Colaborador."
                      : "Como gestor, você pode criar contas de Colaborador."}
                  </p>

                  {creatableRoles.length > 1 ? (
                    <div className="role-picker">
                      {creatableRoles.map((role) => (
                        <button
                          key={role}
                          type="button"
                          className={`role-option ${systemRole === role ? "active" : ""} ${role}`}
                          onClick={() => setSystemRole(role)}
                        >
                          <HiShieldCheck />
                          <span className="role-option-label">
                            {ROLE_LABELS[role]}
                          </span>
                          <span className="role-option-desc">
                            {role === "gestor"
                              ? "Gerencia equipe e operações"
                              : "Acesso operacional básico"}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="role-fixed">
                      <span className={`access-badge ${systemRole}`}>
                        {ROLE_LABELS[systemRole]}
                      </span>
                      <span>Perfil que será criado para este cadastro</span>
                    </div>
                  )}

                  <div className="form-row">
                    <div className="form-group">
                      <label>Senha *</label>
                      <div className="password-field">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Mín. 6 caracteres e 1 maiúscula"
                          required={criarAcesso}
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => setShowPassword(!showPassword)}
                          tabIndex={-1}
                        >
                          {showPassword ? <HiEyeOff /> : <HiEye />}
                        </button>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Confirmar senha *</label>
                      <div className="password-field">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repita a senha"
                          required={criarAcesso}
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="form-section-hint muted">
                  Ative &quot;Criar login&quot; para gerar uma conta de acesso
                  com e-mail e senha.
                </p>
              )}
            </section>
          )}

          {colaborador && hasSystemAccess && (
            <p className="form-section-hint muted">
              O acesso ao sistema deste colaborador já existe. Para alterar
              senha ou perfil, use a tela de Administração (admin).
            </p>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving
                ? "Salvando..."
                : colaborador
                  ? "Atualizar"
                  : criarAcesso
                    ? "Cadastrar e criar acesso"
                    : "Cadastrar"}
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );

  return renderModalPortal(modalContent);
};

export default Colaboradores;
