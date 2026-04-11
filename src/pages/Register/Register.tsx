import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { HiUser, HiMail, HiLockClosed, HiEye, HiEyeOff } from "react-icons/hi";
import { useAuth } from "../../hooks/useAuth";
import type { RegisterCredentials } from "../../types/user";
import "./Register.css";

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, loading, user } = useAuth();
  const [formData, setFormData] = useState<RegisterCredentials>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "colaborador",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterCredentials, string>>>({});
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : false;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors: Partial<Record<keyof RegisterCredentials, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome completo é obrigatório";
    } else if (formData.name.trim().length < 3) {
      newErrors.name = "Nome deve ter no mínimo 3 caracteres";
    }

    if (!formData.email) {
      newErrors.email = "E-mail é obrigatório";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "E-mail inválido";
    }

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

    if (!formData.role) {
      newErrors.role = "Selecione um papel para o usuário";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearInput = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "colaborador",
    });
    setErrors({});
  };

  // Somente admin pode acessar a tela de cadastro de usuários
  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        role: formData.role,
      });
      navigate("/dashboard");
      clearInput();
    } catch (error) {
      console.error("Erro ao registrar usuário:", error);
      setErrors({
        name: "Erro ao registrar usuário",
        email: "Erro ao registrar usuário",
        password: "Erro ao registrar usuário",
        confirmPassword: "Erro ao registrar usuário",
      });
    }
  };

  return (
    <div className="register-container">
      <div className="register-background">
        <div className="shape-1"></div>
        <div className="shape-2"></div>
        <div className="shape-3"></div>
      </div>

      <div className="register-card">
        <div className="register-header">
          <div className="logo-container">
            <div className="logo-icon">
              <HiUser size={48} />
            </div>
          </div>
          <h1>Criar Nova Conta</h1>
          <p>Preencha seus dados para acessar a plataforma de gestão</p>
        </div>

        <form className="register-form" onSubmit={handleSubmit}>
          <div className="register-form-group">
            <label htmlFor="name">Nome Completo</label>
            <div className="register-input-wrapper">
              <HiUser className="register-input-icon" />
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="João Silva"
                className={errors.name ? "error" : ""}
              />
            </div>
            {errors.name && (
              <span className="register-error-message">{errors.name}</span>
            )}
          </div>

          <div className="register-form-group">
            <label htmlFor="email">E-mail Corporativo</label>
            <div className="register-input-wrapper">
              <HiMail className="register-input-icon" />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="joao.silva@empresa.com"
                className={errors.email ? "error" : ""}
              />
            </div>
            {errors.email && (
              <span className="register-error-message">{errors.email}</span>
            )}
          </div>

          <div className="register-form-group">
            <label htmlFor="password">Senha</label>
            <div className="register-input-wrapper">
              <HiLockClosed className="register-input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Mínimo 6 caracteres e 1 maiúscula"
                className={errors.password ? "error" : ""}
              />
              <button
                type="button"
                className="register-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <HiEyeOff /> : <HiEye />}
              </button>
            </div>
            {errors.password && (
              <span className="register-error-message">{errors.password}</span>
            )}
          </div>

          <div className="register-form-group">
            <label htmlFor="confirmPassword">Confirmar Senha</label>
            <div className="register-input-wrapper">
              <HiLockClosed className="register-input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Digite a senha novamente"
                className={errors.confirmPassword ? "error" : ""}
              />
            </div>
            {errors.confirmPassword && (
              <span className="register-error-message">{errors.confirmPassword}</span>
            )}
          </div>

          <div className="register-form-group">
            <label htmlFor="role">Papel do Usuário</label>
            <div className="register-input-wrapper">
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className={errors.role ? "error" : ""}
              >
                <option value="colaborador">Colaborador</option>
                <option value="gestor">Gestor</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            {errors.role && (
              <span className="register-error-message">{errors.role}</span>
            )}
          </div>

          <div className="register-form-group register-checkbox-group">
            <label className="register-checkbox-container">
              <input
                type="checkbox"
                name="termsAccepted"
                onChange={handleChange}
              />
              <span className="register-checkmark"></span>
              <span className="register-checkbox-label">
                Eu aceito os termos de uso e a política de privacidade
              </span>
            </label>
          </div>

          <button type="submit" className="register-btn-primary" disabled={loading}>
            {loading ? "Criando conta..." : "Criar Conta"}
          </button>

          <div className="register-divider">
            <span>ou</span>
          </div>

          <button
            type="button"
            className="register-btn-secondary"
            onClick={() => navigate("/login")}
          >
            Já tenho uma conta
          </button>
        </form>

        <div className="register-footer">
          <p>© 2025 Sistema de Gestão RH. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
};

export default Register;
