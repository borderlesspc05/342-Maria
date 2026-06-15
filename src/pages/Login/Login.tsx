import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { HiMail, HiLockClosed } from "react-icons/hi";
import { useAuth } from "../../hooks/useAuth";
import { WhatsAppButton } from "../../components/ui/WhatsAppButton";
import { WhatsAppFab } from "../../components/ui/WhatsAppFab";
import { buildSupportMessage } from "../../utils/whatsapp";
import "./Login.css";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, user, loading: authLoading } = useAuth();

  /* Se já houver sessão ativa, redireciona direto ao dashboard */
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [rememberMe, setRememberMe] = useState(false);

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});

  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!formData.email) {
      newErrors.email = "E-mail é obrigatório";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "E-mail inválido";
    }

    if (!formData.password) {
      newErrors.password = "Senha é obrigatória";
    } else if (formData.password.length < 6) {
      newErrors.password = "Senha deve ter no mínimo 6 caracteres";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearInput = () => {
    setFormData({ email: "", password: "" });
    setRememberMe(false);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      await login({
        email: formData.email,
        password: formData.password,
      });

      navigate("/dashboard");
      clearInput();
    } catch (err) {
      setErrors({
        general: "E-mail ou senha inválidos. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  /* Enquanto o Firebase verifica a sessão salva, não mostra o formulário */
  if (authLoading) {
    return (
      <div className="login-container">
        <div className="login-background">
          <div className="shape-1"></div>
          <div className="shape-2"></div>
        </div>
        <div className="login-card login-card--loading">
          <div className="login-spinner" aria-label="Verificando sessão..." />
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="shape-1"></div>
        <div className="shape-2"></div>
      </div>

      <div className="login-card">
        <div className="login-header">
          <div className="logo-container">
            <img
              src="/Sis_Gestão_RH-removebg-preview.png"
              alt="Sistema de Gestão RH"
              className="login-logo"
            />
          </div>
          <h1>Bem-vindo de volta!</h1>
          <p>Acesse sua conta para continuar</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {errors.general && (
            <span className="login-error-message">{errors.general}</span>
          )}

          <div className="login-form-group login-form-group-1">
            <label htmlFor="email">E-mail</label>
            <div className="login-input-wrapper">
              <HiMail className="login-input-icon" />
              <input
                type="email"
                id="email"
                name="email"
                placeholder="seu.email@empresa.com"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? "error" : ""}
              />
            </div>
            {errors.email && (
              <span className="login-error-message">{errors.email}</span>
            )}
          </div>

          <div className="login-form-group login-form-group-2">
            <label htmlFor="password">Senha</label>
            <div className="login-input-wrapper">
              <HiLockClosed className="login-input-icon" />
              <input
                type="password"
                id="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? "error" : ""}
              />
            </div>
            {errors.password && (
              <span className="login-error-message">{errors.password}</span>
            )}
          </div>

          <div className="login-form-options login-form-group-3">
            <label className="login-checkbox-container">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span className="login-checkmark"></span>
              Lembrar-me
            </label>

            <a
              href="#"
              className="login-forgot-password"
              onClick={(e) => {
                e.preventDefault();
                navigate("/forgot-password");
              }}
            >
              Esqueceu a senha?
            </a>
          </div>

          <button
            type="submit"
            className="login-btn-primary login-form-group-4"
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <div className="login-footer">
            <p>© {new Date().getFullYear()} Sistema de Gestão RH. Todos os direitos reservados.</p>
            <WhatsAppButton
              variant="link"
              label="Precisa de ajuda? Fale no WhatsApp"
              message={buildSupportMessage("Estou com dificuldade para entrar no sistema.")}
            />
          </div>
        </form>
      </div>
      <WhatsAppFab />
    </div>
  );
};

export default Login;
