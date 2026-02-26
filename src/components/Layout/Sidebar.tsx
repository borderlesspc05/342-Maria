import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  HiHome,
  HiUserGroup,
  HiTrendingUp,
  HiDocumentText,
  HiFolder,
  HiBookOpen,
  HiChartBar,
  HiCurrencyDollar,
  HiBell,
  HiMenu,
  HiShieldCheck,
  HiCloudUpload,
} from "react-icons/hi";
import { paths } from "../../routes/paths";
import "./Sidebar.css";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { user } = useAuth();
  const menuItems = [
    {
      path: "/dashboard",
      icon: HiHome,
      label: "Dashboard",
    },
    {
      path: "/notificacoes",
      icon: HiBell,
      label: "Notificações",
    },
    {
      path: "/administracao",
      icon: HiShieldCheck,
      label: "Administração",
      roles: ["admin"],
    },
    {
      path: "/colaboradores",
      icon: HiUserGroup,
      label: "Colaboradores",
      roles: ["admin", "gestor"],
    },
    {
      path: "/premios-produtividade",
      icon: HiTrendingUp,
      label: "Prêmio de Produtividade",
      roles: ["admin", "gestor"],
    },
    {
      path: "/boletins-medicao",
      icon: HiDocumentText,
      label: "Boletins de Medição",
      roles: ["admin", "gestor"],
    },
    {
      path: "/documentacoes",
      icon: HiFolder,
      label: "Documentações e Integrações",
      roles: ["admin", "gestor"],
    },
    {
      path: "/caderno-virtual",
      icon: HiBookOpen,
      label: "Caderno Virtual",
    },
    {
      path: "/financeiro",
      icon: HiCurrencyDollar,
      label: "Gestão Financeira",
      roles: ["admin"],
    },
    {
      path: "/relatorios",
      icon: HiChartBar,
      label: "Relatórios",
      roles: ["admin", "gestor"],
    },
    {
      path: paths.documentosFinanceiros,
      icon: HiDocumentText,
      label: "Documentos Financeiros",
      roles: ["admin", "gestor"],
    },
    {
      path: paths.backup,
      icon: HiCloudUpload,
      label: "Backup",
      roles: ["admin"],
    },
  ];

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <button
            className="sidebar-menu-button"
            onClick={onToggle}
            aria-label="Toggle sidebar"
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            <HiMenu className="menu-icon" />
          </button>
          {!collapsed && (
            <span className="sidebar-header-text">Sidebar</span>
          )}
        </div>
      </div>

      <nav className="sidebar-nav">
        <ul className="nav-list">
          {menuItems
            .filter((item) => {
              if (!item.roles || item.roles.length === 0) return true;
              if (!user?.role) return false;
              return item.roles.includes(user.role);
            })
            .map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path} className="nav-item">
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? "active" : ""}`
                  }
                >
                  <Icon className="nav-icon" />
                  {!collapsed && (
                    <span className="nav-label">{item.label}</span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
