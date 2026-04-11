import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { paths } from "../../routes/paths";
import {
  HiBell,
  HiUser,
  HiLogout,
  HiCog,
  HiMenu,
  HiX,
  HiInformationCircle,
  HiDocumentText,
  HiStar,
  HiChartBar,
} from "react-icons/hi";
import { useAuth } from "../../hooks/useAuth";
import { useNotificationContext } from "../../contexts/NotificationContext";
import "./Header.css";

interface HeaderProps {
  onMenuClick: () => void;
  collapsed?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, collapsed = false }) => {
  const { user, logOut } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const {
    notificacoes,
    naoLidas,
    marcarComoLida,
    marcarTodasComoLidas,
    deletar,
  } = useNotificationContext();

  // Mostrar apenas as 5 mais recentes no dropdown
  const notificacoesRecentes = notificacoes.slice(0, 5);

  const handleLogout = async () => {
    try {
      await logOut();
      navigate("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const handleNotificationClick = async (id: string, link?: string) => {
    await marcarComoLida(id);
    setShowNotifications(false);
    if (link) {
      navigate(link);
    }
  };

  const handleMarcarTodasLidas = async () => {
    await marcarTodasComoLidas();
  };

  const handleDeletarNotificacao = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deletar(id);
  };

  const formatarTempo = (data: Date) => {
    const agora = new Date();
    const diff = agora.getTime() - data.getTime();
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);

    if (minutos < 1) return "Agora";
    if (minutos < 60) return `Há ${minutos} min`;
    if (horas < 24) return `Há ${horas} h`;
    if (dias === 1) return "Ontem";
    if (dias < 7) return `Há ${dias} dias`;
    return data.toLocaleDateString();
  };

  const getNotificationIcon = (tipo: string) => {
    switch (tipo) {
      case "documento_vencido":
      case "documento_vencendo":
        return <HiDocumentText className="notification-icon-svg" />;
      case "premio_lancado":
        return <HiStar className="notification-icon-svg" />;
      case "boletim_pendente":
      case "boletim_vencendo":
        return <HiChartBar className="notification-icon-svg" />;
      default:
        return <HiBell className="notification-icon-svg" />;
    }
  };

  const getPriorityClass = (prioridade: string) => {
    switch (prioridade) {
      case "urgente":
        return "priority-urgent";
      case "alta":
        return "priority-high";
      case "media":
        return "priority-medium";
      default:
        return "priority-low";
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case "admin":
        return "Administrador";
      case "gestor":
        return "Gestor";
      default:
        return "Colaborador";
    }
  };

  return (
    <header className={`header ${collapsed ? "sidebar-collapsed" : ""}`}>
      <div className="header-left">
        <button
          className="menu-toggle"
          onClick={onMenuClick}
          aria-label="Toggle menu"
        >
          <HiMenu />
        </button>
        <Link to={paths.dashboard} className="header-logo-link" aria-label="Ir para o dashboard">
          <img
            src="/Sis_Gestão_RH-removebg-preview.png"
            alt="Sistema de Gestão RH"
            className="header-logo"
          />
        </Link>
      </div>

      <div className="header-right">
        <div className="header-actions">
          <div className="notification-container">
            <button
              className="icon-button"
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label="Notificações"
            >
              <HiBell />
              {naoLidas > 0 && (
                <span className="notification-badge">
                  {naoLidas > 99 ? "99+" : naoLidas}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="dropdown-menu notifications-menu">
                <div className="dropdown-header">
                  <h3>Notificações</h3>
                  {naoLidas > 0 && (
                    <button
                      className="mark-read"
                      onClick={handleMarcarTodasLidas}
                    >
                      Marcar todas como lidas
                    </button>
                  )}
                </div>

                {notificacoesRecentes.length === 0 ? (
                  <div className="notification-empty">
                    <HiInformationCircle />
                    <p>Nenhuma notificação</p>
                  </div>
                ) : (
                  <ul className="notification-list">
                    {notificacoesRecentes.map((notificacao) => (
                      <li
                        key={notificacao.id}
                        className={`notification-item ${!notificacao.lida ? "unread" : ""
                          } ${getPriorityClass(notificacao.prioridade)}`}
                        onClick={() =>
                          handleNotificationClick(
                            notificacao.id,
                            notificacao.link
                          )
                        }
                      >
                        <div className="notification-icon">
                          {getNotificationIcon(notificacao.tipo)}
                        </div>
                        <div className="notification-content">
                          <p className="notification-title">
                            {notificacao.titulo}
                          </p>
                          <p className="notification-text">
                            {notificacao.mensagem}
                          </p>
                          <span className="notification-time">
                            {formatarTempo(notificacao.criadoEm)}
                          </span>
                        </div>
                        <button
                          className="notification-delete"
                          onClick={(e) =>
                            handleDeletarNotificacao(e, notificacao.id)
                          }
                          aria-label="Deletar notificação"
                        >
                          <HiX />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="dropdown-footer">
                  <button
                    className="view-all"
                    onClick={() => {
                      navigate("/notificacoes");
                      setShowNotifications(false);
                    }}
                  >
                    Ver todas as notificações
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="user-container">
            <button
              className="user-button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              aria-label="Menu do usuário"
            >
              <div className="user-avatar">
                {user?.profileImageUrl ? (
                  <img
                    src={user.profileImageUrl}
                    alt="Imagem de perfil"
                    className="user-avatar-image"
                  />
                ) : (
                  <HiUser />
                )}
              </div>
              <div className="user-info">
                <span className="user-name">{user?.name || "Usuário"}</span>
                <span className="user-role">{getRoleLabel(user?.role)}</span>
              </div>
            </button>

            {showUserMenu && (
              <div className="dropdown-menu user-menu">
                <div className="user-menu-header">
                  <div className="user-avatar-large">
                    <HiUser />
                  </div>
                  <div className="user-details">
                    <p className="user-name-large">{user?.name || "Usuário"}</p>
                    <p className="user-email">
                      {user?.email || "email@empresa.com"}
                    </p>
                  </div>
                </div>
                <ul className="menu-list">
                  <li>
                    <button
                      className="menu-item"
                      onClick={() => navigate("/perfil")}
                    >
                      <HiUser />
                      <span>Meu Perfil</span>
                    </button>
                  </li>
                  <li>
                    <button
                      className="menu-item"
                      onClick={() => navigate("/Configuracoes")}
                    >
                      <HiCog />
                      <span>Configurações</span>
                    </button>
                  </li>
                  <li className="menu-divider"></li>
                  <li>
                    <button className="menu-item logout" onClick={handleLogout}>
                      <HiLogout />
                      <span>Sair</span>
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {(showUserMenu || showNotifications) && (
        <div
          className="overlay"
          onClick={() => {
            setShowUserMenu(false);
            setShowNotifications(false);
          }}
        />
      )}
    </header>
  );
};

export default Header;
