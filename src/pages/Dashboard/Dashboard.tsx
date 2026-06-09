import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../components/Layout";
import {
  HiUsers,
  HiDocumentText,
  HiClipboardList,
  HiExclamationCircle,
  HiCheckCircle,
  HiClock,
  HiTrendingUp,
  HiFolder,
  HiX,
  HiArrowRight,
  HiCurrencyDollar,
  HiCalendar,
  HiChartBar,
  HiBell,
  HiLink,
} from "react-icons/hi";
import { paths } from "../../routes/paths";
import { colaboradorService } from "../../services/colaboradorService";
import { documentacoesService } from "../../services/documentacoesService";
import { boletimMedicaoService } from "../../services/boletimMedicaoService";
import { premioProdutividadeService } from "../../services/premioProdutividadeService";
import { cadernoVirtualService } from "../../services/cadernoVirtualService";
import { useNotificationContext } from "../../contexts/NotificationContext";
import { formatCurrency } from "../../utils/exportUtils";
import { PageHeader } from "../../components/ui/PageHeader";
import "./Dashboard.css";

const MESES_PT: string[] = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface DashboardStats {
  colaboradores: number;
  documentosPendentes: number;
  documentosVencendo: number;
  boletinsMes: number;
  premiosAtivos: number;
  lancamentosHoje: number;
  valorBoletinsMes: number;
  valorPremiosMes: number;
}

interface RecentActivity {
  id: string;
  type: "lancamento" | "premio" | "boletim" | "documento";
  title: string;
  description: string;
  time: Date;
  icon: React.ReactNode;
  color: string;
}

const initialStats: DashboardStats = {
  colaboradores: 0,
  documentosPendentes: 0,
  documentosVencendo: 0,
  boletinsMes: 0,
  premiosAtivos: 0,
  lancamentosHoje: 0,
  valorBoletinsMes: 0,
  valorPremiosMes: 0,
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { notificacoes, naoLidas, marcarComoLida, deletar, loading: notifLoading } = useNotificationContext();
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [statsLoading, setStatsLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const now = new Date();
      const mesAtual = MESES_PT[now.getMonth()];
      const anoAtual = now.getFullYear();
      const hoje = now.toISOString().split("T")[0];

      const [
        colaboradores,
        documentos,
        boletins,
        premios,
        lancamentos,
      ] = await Promise.all([
        colaboradorService.list(),
        documentacoesService.list(),
        boletimMedicaoService.getAll({ mes: mesAtual, ano: anoAtual }),
        premioProdutividadeService.list(),
        cadernoVirtualService.list().catch(() => []),
      ]);

      // Documentos pendentes e vencendo
      const documentosPendentes = documentos.filter(
        (d) => d.status === "Pendente" || d.status === "Vencido"
      ).length;

      const documentosVencendo = documentos.filter(
        (d) => d.status === "Vencendo"
      ).length;

      // Lançamentos de hoje
      const lancamentosHoje = lancamentos.filter((l) => {
        const lancDate = l.dataLancamento instanceof Date 
          ? l.dataLancamento 
          : new Date(l.dataLancamento);
        return lancDate.toISOString().split("T")[0] === hoje;
      }).length;

      // Valor total de boletins emitidos no mês
      const valorBoletinsMes = boletins
        .filter((b) => b.status === "Emitido")
        .reduce((sum, b) => sum + b.valor, 0);

      // Prêmios do mês atual
      const premiosMesAtual = premios.filter((p) => {
        const premioDate = p.dataPremio instanceof Date 
          ? p.dataPremio 
          : new Date(p.dataPremio || p.criadoEm);
        return (
          premioDate.getMonth() === now.getMonth() &&
          premioDate.getFullYear() === anoAtual
        );
      });

      const valorPremiosMes = premiosMesAtual.reduce(
        (sum, p) => sum + (p.valor || 0),
        0
      );

      setStats({
        colaboradores: colaboradores.length,
        documentosPendentes,
        documentosVencendo,
        boletinsMes: boletins.length,
        premiosAtivos: premiosMesAtual.length,
        lancamentosHoje,
        valorBoletinsMes,
        valorPremiosMes,
      });

      // Montar atividades recentes
      const activities: RecentActivity[] = [];

      // Últimos lançamentos
      lancamentos
        .slice(0, 3)
        .forEach((l) => {
          const lancTime = l.dataLancamento instanceof Date 
            ? l.dataLancamento 
            : new Date(l.dataLancamento);
          activities.push({
            id: `lanc-${l.id}`,
            type: "lancamento",
            title: "Novo lançamento no Caderno Virtual",
            description: `${l.tipoMovimentacao}: ${l.colaboradorNome} - ${formatCurrency(l.valor)}`,
            time: lancTime,
            icon: <HiClipboardList />,
            color: "#3b82f6",
          });
        });

      // Últimos prêmios
      premios
        .slice(0, 2)
        .forEach((p) => {
          const premioTime = p.dataPremio instanceof Date 
            ? p.dataPremio 
            : new Date(p.dataPremio || p.criadoEm);
          activities.push({
            id: `premio-${p.id}`,
            type: "premio",
            title: "Prêmio de Produtividade",
            description: `${p.colaboradorNome || p.colaboradorId} - ${formatCurrency(p.valor || 0)} - ${p.status}`,
            time: premioTime,
            icon: <HiCurrencyDollar />,
            color: "#10b981",
          });
        });

      // Últimos boletins
      boletins
        .slice(0, 2)
        .forEach((b) => {
          activities.push({
            id: `boletim-${b.id}`,
            type: "boletim",
            title: "Boletim de Medição",
            description: `${b.cliente} - ${formatCurrency(b.valor)} - ${b.status}`,
            time: b.criadoEm instanceof Date ? b.criadoEm : new Date(b.criadoEm),
            icon: <HiDocumentText />,
            color: "#f59e0b",
          });
        });

      // Ordenar por data (mais recentes primeiro)
      activities.sort((a, b) => b.time.getTime() - a.time.getTime());
      setRecentActivities(activities.slice(0, 8));

    } catch (error) {
      console.error("Erro ao carregar estatísticas do dashboard:", error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Converter notificações do contexto para o formato do Dashboard
  const dashboardNotifications = useMemo(() => {
    return notificacoes.slice(0, 10).map((notif) => {
      // Mapear tipo para categoria e ícone
      let type: "alert" | "warning" | "success" | "info" = "info";
      let category: "integracao" | "premio" | "boletim" | "documentacao" | "geral" = "geral";

      switch (notif.tipo) {
        case "documento_vencido":
          type = "alert";
          category = "documentacao";
          break;
        case "documento_vencendo":
          type = "warning";
          category = "documentacao";
          break;
        case "premio_lancado":
          type = "success";
          category = "premio";
          break;
        case "boletim_pendente":
        case "boletim_vencendo":
          type = "warning";
          category = "boletim";
          break;
        case "sistema":
          type = "info";
          category = "geral";
          break;
        default:
          type = "info";
          category = "geral";
      }

      // Formatar tempo relativo
      const now = new Date();
      const diffMs = now.getTime() - notif.criadoEm.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      let timeStr = "";
      if (diffHours < 1) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        timeStr = `Há ${diffMinutes} ${diffMinutes === 1 ? "minuto" : "minutos"}`;
      } else if (diffHours < 24) {
        timeStr = `Há ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`;
      } else if (diffDays === 1) {
        timeStr = "Ontem";
      } else if (diffDays < 7) {
        timeStr = `Há ${diffDays} dias`;
      } else {
        timeStr = notif.criadoEm.toLocaleDateString("pt-BR");
      }

      return {
        id: notif.id,
        type,
        title: notif.titulo,
        message: notif.mensagem,
        time: timeStr,
        category,
        read: notif.lida,
        link: notif.link,
      };
    });
  }, [notificacoes]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await marcarComoLida(id);
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
    }
  };

  const handleRemoveNotification = async (id: string) => {
    try {
      await deletar(id);
    } catch (error) {
      console.error("Erro ao remover notificação:", error);
    }
  };

  const handleNotificationClick = (notification: typeof dashboardNotifications[0]) => {
    // Marcar como lida ao clicar
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    
    // Navegar se tiver link
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const getNotificationIcon = (type: "alert" | "warning" | "success" | "info") => {
    switch (type) {
      case "alert":
        return <HiExclamationCircle className="icon-alert" />;
      case "warning":
        return <HiExclamationCircle className="icon-warning" />;
      case "success":
        return <HiCheckCircle className="icon-success" />;
      case "info":
        return <HiClock className="icon-info" />;
      default:
        return <HiClock className="icon-info" />;
    }
  };

  const getCategoryLabel = (category: "integracao" | "premio" | "boletim" | "documentacao" | "geral") => {
    switch (category) {
      case "integracao":
        return "Integração";
      case "premio":
        return "Prêmio";
      case "boletim":
        return "Boletim";
      case "documentacao":
        return "Documentação";
      default:
        return "Geral";
    }
  };

  const todayNotifications = dashboardNotifications.filter((n) =>
    n.time.includes("Há") || n.time.includes("Hoje") || n.time.includes("minuto") || n.time.includes("hora")
  );

  return (
    <Layout>
      <div className="dashboard">
        <PageHeader
          badge="Visão geral"
          title="Painel principal"
          subtitle="Resumo do dia com alertas, indicadores e atalhos para as áreas do sistema."
          actions={
            <div className="dashboard-date">
              {new Date().toLocaleDateString("pt-BR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          }
        />

        <div className="stats-grid">
          <div
            className="stat-card stat-card-clickable"
            onClick={() => navigate(paths.cadernoVirtual)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate(paths.cadernoVirtual)}
            aria-label="Ver caderno virtual"
          >
            <div className="stat-icon stat-icon-blue">
              <HiClipboardList />
            </div>
            <div className="stat-content">
              <h3 className="stat-label">Lançamentos Hoje</h3>
              <p className="stat-value">
                {statsLoading ? "—" : stats.lancamentosHoje}
              </p>
              <span className="stat-ver-mais">
                Ver caderno virtual <HiArrowRight />
              </span>
            </div>
          </div>

          <div
            className="stat-card stat-card-clickable"
            onClick={() => navigate(paths.documentacoes)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate(paths.documentacoes)}
            aria-label="Ver documentos pendentes"
          >
            <div className="stat-icon stat-icon-red">
              <HiExclamationCircle />
            </div>
            <div className="stat-content">
              <h3 className="stat-label">Documentos Pendentes</h3>
              <p className="stat-value stat-value-danger">
                {statsLoading ? "—" : stats.documentosPendentes}
              </p>
              <span className="stat-ver-mais">
                Ver documentações <HiArrowRight />
              </span>
            </div>
          </div>

          <div
            className="stat-card stat-card-clickable"
            onClick={() => navigate(paths.documentacoes)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate(paths.documentacoes)}
            aria-label="Ver documentos vencendo"
          >
            <div className="stat-icon stat-icon-orange">
              <HiClock />
            </div>
            <div className="stat-content">
              <h3 className="stat-label">Documentos Vencendo</h3>
              <p className="stat-value stat-value-warning">
                {statsLoading ? "—" : stats.documentosVencendo}
              </p>
              <span className="stat-ver-mais">
                Ver documentações <HiArrowRight />
              </span>
            </div>
          </div>

          <div
            className="stat-card stat-card-clickable"
            onClick={() => navigate(paths.boletinsMedicao)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate(paths.boletinsMedicao)}
            aria-label="Ver boletins"
          >
            <div className="stat-icon stat-icon-green">
              <HiChartBar />
            </div>
            <div className="stat-content">
              <h3 className="stat-label">Boletins do Mês</h3>
              <p className="stat-value stat-value-success">
                {statsLoading ? "—" : stats.boletinsMes}
              </p>
              <span className="stat-ver-mais">
                Ver boletins <HiArrowRight />
              </span>
            </div>
          </div>

          <div
            className="stat-card stat-card-clickable"
            onClick={() => navigate(paths.boletinsMedicao)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate(paths.boletinsMedicao)}
            aria-label="Ver valor de boletins"
          >
            <div className="stat-icon stat-icon-teal">
              <HiCurrencyDollar />
            </div>
            <div className="stat-content">
              <h3 className="stat-label">Faturamento - Boletins</h3>
              <p className="stat-value stat-value-teal">
                {statsLoading ? "—" : formatCurrency(stats.valorBoletinsMes)}
              </p>
              <span className="stat-ver-mais">
                Ver boletins <HiArrowRight />
              </span>
            </div>
          </div>

          <div
            className="stat-card stat-card-clickable"
            onClick={() => navigate(paths.premiosProdutividade)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate(paths.premiosProdutividade)}
            aria-label="Ver prêmios"
          >
            <div className="stat-icon stat-icon-purple">
              <HiTrendingUp />
            </div>
            <div className="stat-content">
              <h3 className="stat-label">Prêmios do Mês</h3>
              <p className="stat-value stat-value-purple">
                {statsLoading ? "—" : formatCurrency(stats.valorPremiosMes)}
              </p>
              <span className="stat-ver-mais">
                Ver prêmios <HiArrowRight />
              </span>
            </div>
          </div>

          <div
            className="stat-card stat-card-clickable"
            onClick={() => navigate(paths.colaboradores)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate(paths.colaboradores)}
            aria-label="Ver colaboradores"
          >
            <div className="stat-icon stat-icon-indigo">
              <HiUsers />
            </div>
            <div className="stat-content">
              <h3 className="stat-label">Total de Colaboradores</h3>
              <p className="stat-value">
                {statsLoading ? "—" : stats.colaboradores}
              </p>
              <span className="stat-ver-mais">
                Ver colaboradores <HiArrowRight />
              </span>
            </div>
          </div>

          <div
            className="stat-card stat-card-clickable"
            onClick={() => navigate(paths.cadernoVirtual)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate(paths.cadernoVirtual)}
            aria-label="Ver resumo mensal"
          >
            <div className="stat-icon stat-icon-pink">
              <HiCalendar />
            </div>
            <div className="stat-content">
              <h3 className="stat-label">Prêmios Ativos</h3>
              <p className="stat-value">
                {statsLoading ? "—" : stats.premiosAtivos}
              </p>
              <span className="stat-ver-mais">
                Ver prêmios <HiArrowRight />
              </span>
            </div>
          </div>
        </div>

        {/* Widget de Atividades Recentes */}
        <div className="recent-activities-section">
          <div className="section-header">
            <h2 className="section-title">
              <HiClock className="section-icon" />
              Atividades Recentes
            </h2>
            <span className="section-subtitle">
              Últimas movimentações do sistema
            </span>
          </div>

          <div className="activities-grid">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <div key={activity.id} className="activity-card">
                  <div
                    className="activity-icon"
                    style={{ color: activity.color }}
                  >
                    {activity.icon}
                  </div>
                  <div className="activity-content">
                    <h4 className="activity-title">{activity.title}</h4>
                    <p className="activity-description">{activity.description}</p>
                    <span className="activity-time">
                      {activity.time.toLocaleDateString("pt-BR")} às{" "}
                      {activity.time.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-activities">
                <HiFolder className="empty-icon" />
                <p>Nenhuma atividade recente</p>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-content">
          <div className="notifications-section">
            <div className="section-header">
              <div className="section-header-left">
                <h2 className="section-title">
                  <HiBell className="section-icon" />
                  Notificações e Alertas do Dia
                </h2>
                {naoLidas > 0 && (
                  <div className="section-badge pulse">
                    {naoLidas} não {naoLidas === 1 ? "lida" : "lidas"}
                  </div>
                )}
              </div>
              {dashboardNotifications.length > 0 && (
                <button
                  className="btn-view-all"
                  onClick={() => navigate(paths.notificacoes)}
                >
                  Ver todas <HiArrowRight />
                </button>
              )}
            </div>

            {notifLoading ? (
              <div className="notifications-loading">
                <div className="spinner"></div>
                <p>Carregando notificações...</p>
              </div>
            ) : todayNotifications.length > 0 ? (
              <div className="notifications-list">
                {todayNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`notification-card ${notification.type} ${
                      !notification.read ? "unread" : ""
                    } ${notification.link ? "clickable" : ""}`}
                    onClick={() => notification.link && handleNotificationClick(notification)}
                    role={notification.link ? "button" : undefined}
                    tabIndex={notification.link ? 0 : undefined}
                  >
                    <div className="notification-icon">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="notification-content">
                      <div className="notification-header">
                        <h3 className="notification-title">
                          {notification.title}
                        </h3>
                        <div className="notification-actions">
                          {!notification.read && (
                            <button
                              className="notification-action"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(notification.id);
                              }}
                              title="Marcar como lida"
                            >
                              <HiCheckCircle />
                            </button>
                          )}
                          <button
                            className="notification-action notification-action-danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveNotification(notification.id);
                            }}
                            title="Remover"
                          >
                            <HiX />
                          </button>
                        </div>
                      </div>
                      <p className="notification-message">
                        {notification.message}
                      </p>
                      <div className="notification-footer">
                        <span className="notification-category">
                          {getCategoryLabel(notification.category)}
                        </span>
                        <span className="notification-time">
                          {notification.time}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <HiCheckCircle className="empty-icon" />
                <p>Nenhuma notificação recente</p>
                <span className="empty-subtitle">Você está em dia com tudo!</span>
              </div>
            )}
          </div>

          <div className="alerts-section">
            <div className="section-header">
              <h2 className="section-title">
                <HiExclamationCircle className="section-icon" />
                Alertas Importantes
              </h2>
            </div>

            <div className="alerts-list">
              {dashboardNotifications
                .filter((n) => n.type === "alert" || n.type === "warning")
                .slice(0, 3)
                .map((alert) => (
                  <div
                    key={alert.id}
                    className={`alert-card ${alert.type} ${
                      !alert.read ? "unread" : ""
                    } ${alert.link ? "clickable" : ""}`}
                    onClick={() => alert.link && handleNotificationClick(alert)}
                    role={alert.link ? "button" : undefined}
                    tabIndex={alert.link ? 0 : undefined}
                  >
                    <div className="alert-icon">
                      {getNotificationIcon(alert.type)}
                    </div>
                    <div className="alert-content">
                      <h3 className="alert-title">{alert.title}</h3>
                      <p className="alert-message">{alert.message}</p>
                      <div className="alert-footer">
                        <span className="alert-category">
                          {getCategoryLabel(alert.category)}
                        </span>
                        <span className="alert-time">{alert.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              
              {dashboardNotifications.filter((n) => n.type === "alert" || n.type === "warning").length === 0 && (
                <div className="empty-alerts">
                  <HiCheckCircle className="empty-icon" />
                  <p>Nenhum alerta no momento</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="quick-actions">
          <h2 className="section-title">Ações Rápidas</h2>
          <div className="actions-grid">
            <button
              type="button"
              className="action-button"
              onClick={() => navigate(paths.documentacoes)}
              aria-label="Ver Documentações"
            >
              <span className="action-icon">
                <HiFolder />
              </span>
              <span>Ver Documentações</span>
            </button>
            <button
              type="button"
              className="action-button"
              onClick={() => navigate(paths.premiosProdutividade)}
              aria-label="Ver Prêmios"
            >
              <span className="action-icon">
                <HiTrendingUp />
              </span>
              <span>Ver Prêmios</span>
            </button>
            <button
              type="button"
              className="action-button"
              onClick={() => navigate(paths.boletinsMedicao)}
              aria-label="Ver Boletins"
            >
              <span className="action-icon">
                <HiClipboardList />
              </span>
              <span>Ver Boletins</span>
            </button>
            <button
              type="button"
              className="action-button"
              onClick={() => navigate(paths.documentacoes)}
              aria-label="Gerenciar Integrações"
            >
              <span className="action-icon">
                <HiLink />
              </span>
              <span>Gerenciar Integrações</span>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
