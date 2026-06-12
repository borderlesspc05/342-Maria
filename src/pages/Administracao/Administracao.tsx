import React, { useState, useEffect } from "react";
import {
  HiPlus,
  HiSearch,
  HiPencil,
  HiTrash,
  HiShieldCheck,
  HiUserGroup,
  HiX,
  HiEye,
  HiEyeOff,
} from "react-icons/hi";
import { Layout } from "../../components/Layout";
import {
  getCreatableRoles,
  userManagementService,
} from "../../services/userManagementService";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../contexts/ToastContext";
import type { User, RegisterCredentials } from "../../types/user";
import { renderModalPortal } from "../../utils/renderModalPortal";
import "./Administracao.css";

const Administracao: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState<RegisterCredentials>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "colaborador",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof RegisterCredentials, string>>>({});

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await userManagementService.listAll();
      setUsers(data);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      showToast("Erro ao carregar usuários", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof RegisterCredentials, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório";
    }

    if (!formData.email) {
      newErrors.email = "E-mail é obrigatório";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "E-mail inválido";
    }

    if (!editingUser) {
      if (!formData.password) {
        newErrors.password = "Senha é obrigatória";
      } else if (formData.password.length < 6) {
        newErrors.password = "Senha deve ter no mínimo 6 caracteres";
      } else if (!/[A-Z]/.test(formData.password)) {
        newErrors.password = "Senha deve conter pelo menos 1 letra maiúscula";
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = "Confirmação de senha é obrigatória";
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "As senhas não coincidem";
      }
    }

    if (!formData.role) {
      newErrors.role = "Selecione um papel";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editingUser) {
        // Atualizar usuário existente
        await userManagementService.update(editingUser.uid, {
          name: formData.name,
          email: formData.email,
          role: formData.role,
        });
        showToast("Usuário atualizado com sucesso!", "success");
      } else {
        // Criar novo usuário
        await userManagementService.create(formData);
        showToast("Usuário criado com sucesso!", "success");
      }

      setShowModal(false);
      resetForm();
      await loadUsers();
    } catch (error: any) {
      console.error("Erro ao salvar usuário:", error);
      showToast(error.message || "Erro ao salvar usuário", "error");
    }
  };

  const handleDelete = async (uid: string) => {
    if (uid === currentUser?.uid) {
      showToast("Você não pode deletar seu próprio usuário", "error");
      return;
    }

    if (!window.confirm("Deseja realmente excluir este usuário?")) return;

    try {
      await userManagementService.delete(uid);
      showToast("Usuário excluído com sucesso!", "success");
      await loadUsers();
    } catch (error: any) {
      console.error("Erro ao excluir usuário:", error);
      showToast(error.message || "Erro ao excluir usuário", "error");
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      confirmPassword: "",
      role: user.role || "colaborador",
    });
    setShowModal(true);
  };

  const handleNew = () => {
    setEditingUser(null);
    resetForm();
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "colaborador",
    });
    setErrors({});
    setShowPassword(false);
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case "admin":
        return "Administrador";
      case "gestor":
        return "Gestor";
      case "colaborador":
        return "Colaborador";
      default:
        return "Colaborador";
    }
  };

  const getRoleBadgeClass = (role?: string) => {
    switch (role) {
      case "admin":
        return "role-badge admin";
      case "gestor":
        return "role-badge gestor";
      case "colaborador":
        return "role-badge colaborador";
      default:
        return "role-badge colaborador";
    }
  };

  const creatableRoles = getCreatableRoles(currentUser?.role);

  const filteredUsers = users.filter((user) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      user.name.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      getRoleLabel(user.role).toLowerCase().includes(term)
    );
  });

  return (
    <Layout>
      <div className="administracao-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">
              <HiShieldCheck /> Administração de Usuários
            </h1>
            <p className="page-subtitle">
              Gerencie usuários do sistema e defina seus papéis e permissões
            </p>
          </div>
          <button className="btn-primary" onClick={handleNew}>
            <HiPlus />
            Novo Usuário
          </button>
        </div>

        <div className="filters-section">
          <div className="search-box">
            <HiSearch />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail ou papel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <p>Carregando usuários...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">
            <HiUserGroup />
            <p>Nenhum usuário encontrado</p>
          </div>
        ) : (
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Papel</th>
                  <th>Data de Criação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.uid}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={getRoleBadgeClass(user.role)}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td>
                      {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-icon"
                          onClick={() => handleEdit(user)}
                          title="Editar"
                        >
                          <HiPencil />
                        </button>
                        {user.uid !== currentUser?.uid && (
                          <button
                            className="btn-icon danger"
                            onClick={() => handleDelete(user.uid)}
                            title="Excluir"
                          >
                            <HiTrash />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showModal &&
          renderModalPortal(
          <div className="administracao-page">
            <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>
                  {editingUser ? "Editar Usuário" : "Novo Usuário"}
                </h2>
                <button
                  className="modal-close"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  <HiX />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="user-form">
                <div className="form-group">
                  <label htmlFor="name">Nome Completo *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={errors.name ? "error" : ""}
                    placeholder="João Silva"
                  />
                  {errors.name && (
                    <span className="error-message">{errors.name}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="email">E-mail *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={errors.email ? "error" : ""}
                    placeholder="joao@empresa.com"
                  />
                  {errors.email && (
                    <span className="error-message">{errors.email}</span>
                  )}
                </div>

                {!editingUser && (
                  <>
                    <div className="form-group">
                      <label htmlFor="password">Senha *</label>
                      <div className="password-input-wrapper">
                        <input
                          type={showPassword ? "text" : "password"}
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          className={errors.password ? "error" : ""}
                          placeholder="Mínimo 6 caracteres"
                        />
                        <button
                          type="button"
                          className="toggle-password"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <HiEyeOff /> : <HiEye />}
                        </button>
                      </div>
                      {errors.password && (
                        <span className="error-message">{errors.password}</span>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="confirmPassword">
                        Confirmar Senha *
                      </label>
                      <div className="password-input-wrapper">
                        <input
                          type={showPassword ? "text" : "password"}
                          id="confirmPassword"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          className={errors.confirmPassword ? "error" : ""}
                          placeholder="Digite a senha novamente"
                        />
                        <button
                          type="button"
                          className="toggle-password"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <HiEyeOff /> : <HiEye />}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <span className="error-message">
                          {errors.confirmPassword}
                        </span>
                      )}
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label htmlFor="role">Papel no Sistema *</label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className={errors.role ? "error" : ""}
                    disabled={editingUser?.role === "admin"}
                  >
                    {editingUser?.role === "admin" ? (
                      <option value="admin">Administrador</option>
                    ) : (
                      creatableRoles.map((role) => (
                        <option key={role} value={role}>
                          {getRoleLabel(role)}
                        </option>
                      ))
                    )}
                  </select>
                  {errors.role && (
                    <span className="error-message">{errors.role}</span>
                  )}
                  <small className="form-hint">
                    Admin pode criar Gestor ou Colaborador. Gestores são criados
                    apenas por administradores.
                  </small>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingUser ? "Atualizar" : "Criar"} Usuário
                  </button>
                </div>
              </form>
            </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Administracao;
