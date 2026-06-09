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
  onNavigate?: () => void;
}

type MenuItem = {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  roles?: Array<"admin" | "gestor" | "colaborador">;
};

type MenuSection = {
  id: string;
  title: string;
  items: MenuItem[];
};

const MENU_SECTIONS: MenuSection[] = [
  {
    id: "inicio",
    title: "Início",
    items: [
      { path: "/dashboard", icon: HiHome, label: "Painel" },
      { path: "/notificacoes", icon: HiBell, label: "Notificações" },
    ],
  },
  {
    id: "equipe",
    title: "Equipe",
    items: [
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
    ],
  },
  {
    id: "operacoes",
    title: "Operações",
    items: [
      {
        path: "/premios-produtividade",
        icon: HiTrendingUp,
        label: "Prêmios",
        roles: ["admin", "gestor"],
      },
      {
        path: "/boletins-medicao",
        icon: HiDocumentText,
        label: "Boletins",
        roles: ["admin", "gestor"],
      },
      {
        path: "/documentacoes",
        icon: HiFolder,
        label: "Documentações",
        roles: ["admin", "gestor"],
      },
      { path: "/caderno-virtual", icon: HiBookOpen, label: "Caderno Virtual" },
      {
        path: "/financeiro",
        icon: HiCurrencyDollar,
        label: "Financeiro",
        roles: ["admin"],
      },
      {
        path: paths.documentosFinanceiros,
        icon: HiDocumentText,
        label: "Docs. Financeiros",
        roles: ["admin", "gestor"],
      },
    ],
  },
  {
    id: "sistema",
    title: "Sistema",
    items: [
      {
        path: "/relatorios",
        icon: HiChartBar,
        label: "Relatórios",
        roles: ["admin", "gestor"],
      },
      {
        path: paths.backup,
        icon: HiCloudUpload,
        label: "Backup",
        roles: ["admin"],
      },
    ],
  },
];

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, onNavigate }) => {
  const { user } = useAuth();

  const canSee = (item: MenuItem) => {
    if (!item.roles?.length) return true;
    if (!user?.role) return false;
    return item.roles.includes(user.role);
  };

  return (
    <aside
      className={`sidebar ${collapsed ? "collapsed" : ""}`}
      aria-label="Menu principal"
    >
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <button
            className="sidebar-menu-button"
            onClick={onToggle}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
            type="button"
          >
            <HiMenu className="menu-icon" />
          </button>
          {!collapsed && (
            <div className="sidebar-brand">
              <span className="sidebar-brand-name">Maria RH</span>
              <span className="sidebar-brand-tag">Gestão operacional</span>
            </div>
          )}
        </div>
      </div>

      <nav className="sidebar-nav">
        {MENU_SECTIONS.map((section) => {
          const visibleItems = section.items.filter(canSee);
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.id} className="nav-section">
              {!collapsed && (
                <p className="nav-section-title">{section.title}</p>
              )}
              <ul className="nav-list">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.path} className="nav-item">
                      <NavLink
                        to={item.path}
                        title={collapsed ? item.label : undefined}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                          `nav-link ${isActive ? "active" : ""}`
                        }
                      >
                        <Icon className="nav-icon" aria-hidden="true" />
                        {!collapsed && (
                          <span className="nav-label">{item.label}</span>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
