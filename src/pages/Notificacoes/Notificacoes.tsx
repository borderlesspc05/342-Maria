import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiBell,
  HiFilter,
  HiX,
  HiCheckCircle,
  HiTrash,
  HiCog,
  HiInformationCircle,
  HiDocumentText,
  HiStar,
  HiChartBar,
  HiMail,
} from "react-icons/hi";
import { useNotificationContext } from "../../contexts/NotificationContext";
import { notificacaoService } from "../../services/notificacaoService";
import { emailNotificationService } from "../../services/emailNotificationService";
import { useAuth } from "../../hooks/useAuth";
import type {
  TipoNotificacao,
  PrioridadeNotificacao,
  ConfiguracaoNotificacao,
} from "../../types/notificacao";
import { Layout } from "../../components/Layout";
import { useToast } from "../../contexts/ToastContext";
import { usePermissions } from "../../hooks/usePermissions";
import { WhatsAppButton } from "../../components/ui/WhatsAppButton";
import { buildSupportMessage } from "../../utils/whatsapp";
import "./Notificacoes.css";

const Notificacoes: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canAccess } = usePermissions();
  const { showToast } = useToast();
  const {
    notificacoes,
    naoLidas,
    stats,
    marcarComoLida,
    marcarTodasComoLidas,
    deletar,
    deletarTodasLidas,
  } = useNotificationContext();

  const [filtroTipo, setFiltroTipo] = useState<TipoNotificacao | "todos">(
    "todos"
  );
  const [filtroPrioridade, setFiltroPrioridade] = useState<
    PrioridadeNotificacao | "todos"
  >("todos");
  const [filtroLida, setFiltroLida] = useState<"todos" | "lidas" | "nao-lidas">(
    "todos"
  );
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [mostrarConfiguracoes, setMostrarConfiguracoes] = useState(false);
  const [configuracoes, setConfiguracoes] =
    useState<ConfiguracaoNotificacao | null>(null);
  const [testEmailLoading, setTestEmailLoading] = useState(false);

  // Carregar configurações
  React.useEffect(() => {
    if (user?.uid) {
      notificacaoService.obterConfiguracoes(user.uid).then(setConfiguracoes);
    }
  }, [user?.uid]);

  // Filtrar notificações
  const notificacoesFiltradas = notificacoes.filter((n) => {
    if (filtroTipo !== "todos" && n.tipo !== filtroTipo) return false;
    if (filtroPrioridade !== "todos" && n.prioridade !== filtroPrioridade)
      return false;
    if (filtroLida === "lidas" && !n.lida) return false;
    if (filtroLida === "nao-lidas" && n.lida) return false;
    return true;
  });

  const handleNotificationClick = async (id: string, link?: string) => {
    await marcarComoLida(id);
    if (link && canAccess(link)) {
      navigate(link);
    }
  };

  const isDocumentNotification = (tipo: TipoNotificacao) =>
    tipo === "documento_vencido" || tipo === "documento_vencendo";

  const formatarTempo = (data: Date) => {
    const agora = new Date();
    const diff = agora.getTime() - data.getTime();
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);

    if (minutos < 1) return "Agora";
    if (minutos < 60) return `Há ${minutos} minuto${minutos !== 1 ? "s" : ""}`;
    if (horas < 24) return `Há ${horas} hora${horas !== 1 ? "s" : ""}`;
    if (dias === 1) return "Ontem";
    if (dias < 7) return `Há ${dias} dias`;
    if (dias < 30)
      return `Há ${Math.floor(dias / 7)} semana${
        Math.floor(dias / 7) !== 1 ? "s" : ""
      }`;
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

  const getTipoLabel = (tipo: TipoNotificacao) => {
    switch (tipo) {
      case "documento_vencido":
        return "Documento Vencido";
      case "documento_vencendo":
        return "Documento Vencendo";
      case "premio_lancado":
        return "Prêmio Lançado";
      case "boletim_pendente":
        return "Boletim Pendente";
      case "boletim_vencendo":
        return "Boletim Vencendo";
      case "sistema":
        return "Sistema";
      default:
        return "Outro";
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

  const getPriorityLabel = (prioridade: PrioridadeNotificacao) => {
    switch (prioridade) {
      case "urgente":
        return "Urgente";
      case "alta":
        return "Alta";
      case "media":
        return "Média";
      default:
        return "Baixa";
    }
  };

  const handleSalvarConfiguracoes = async () => {
    if (!user?.uid || !configuracoes) return;

    try {
      await notificacaoService.atualizarConfiguracoes(user.uid, {
        userEmail: user.email ?? configuracoes.userEmail,
        emailNotificacoes: configuracoes.emailNotificacoes,
        emailDocumentoVencendo: configuracoes.emailDocumentoVencendo,
        emailDocumentoVencido: configuracoes.emailDocumentoVencido,
        emailPremioLancado: configuracoes.emailPremioLancado,
        emailBoletimPendente: configuracoes.emailBoletimPendente,
        diasAntesVencimento: configuracoes.diasAntesVencimento,
        horaVerificacao: configuracoes.horaVerificacao,
      });
      showToast("Configurações salvas com sucesso!");
      setMostrarConfiguracoes(false);
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      showToast("Erro ao salvar configurações", "error");
    }
  };

  const handleEnviarTestEmail = async () => {
    const email = user?.email?.trim();
    if (!email) {
      showToast("Sua conta não possui e-mail cadastrado.", "error");
      return;
    }
    setTestEmailLoading(true);
    try {
      const result = await emailNotificationService.sendTestEmail(email);
      if (result.success) {
        showToast(result.message);
      } else {
        showToast(result.message, "error");
      }
    } catch {
      showToast("Não foi possível enviar o e-mail de teste.", "error");
    } finally {
      setTestEmailLoading(false);
    }
  };

  return (
    <Layout>
      <div className="notificacoes-page">
        <div className="page-header">
          <div className="header-content">
            <div className="header-title-section">
              <HiBell className="page-icon" />
              <div>
                <h1>Notificações</h1>
                <p className="page-subtitle">
                  Gerencie suas notificações e alertas do sistema
                </p>
              </div>
            </div>
            <div className="header-actions">
              <button
                className="btn-secondary"
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
              >
                <HiFilter />
                Filtros
              </button>
              <button
                className="btn-secondary"
                onClick={() => setMostrarConfiguracoes(!mostrarConfiguracoes)}
              >
                <HiCog />
                Configurações
              </button>
            </div>
          </div>
        </div>

        {/* Estatísticas */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon total">
                <HiBell />
              </div>
              <div className="stat-content">
                <span className="stat-label">Total</span>
                <span className="stat-value">{stats.total}</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon unread">
                <HiBell />
              </div>
              <div className="stat-content">
                <span className="stat-label">Não Lidas</span>
                <span className="stat-value">{naoLidas}</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon urgent">
                <HiInformationCircle />
              </div>
              <div className="stat-content">
                <span className="stat-label">Urgentes</span>
                <span className="stat-value">
                  {stats.porPrioridade.urgente}
                </span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon documents">
                <HiBell />
              </div>
              <div className="stat-content">
                <span className="stat-label">Documentos</span>
                <span className="stat-value">
                  {stats.porTipo.documento_vencendo +
                    stats.porTipo.documento_vencido}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        {mostrarFiltros && (
          <div className="filtros-container">
            <div className="filtro-group">
              <label>Tipo:</label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value as any)}
              >
                <option value="todos">Todos</option>
                <option value="documento_vencendo">Documento Vencendo</option>
                <option value="documento_vencido">Documento Vencido</option>
                <option value="premio_lancado">Prêmio Lançado</option>
                <option value="boletim_pendente">Boletim Pendente</option>
                <option value="boletim_vencendo">Boletim Vencendo</option>
                <option value="sistema">Sistema</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div className="filtro-group">
              <label>Prioridade:</label>
              <select
                value={filtroPrioridade}
                onChange={(e) => setFiltroPrioridade(e.target.value as any)}
              >
                <option value="todos">Todas</option>
                <option value="urgente">Urgente</option>
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </div>
            <div className="filtro-group">
              <label>Status:</label>
              <select
                value={filtroLida}
                onChange={(e) => setFiltroLida(e.target.value as any)}
              >
                <option value="todos">Todas</option>
                <option value="nao-lidas">Não Lidas</option>
                <option value="lidas">Lidas</option>
              </select>
            </div>
          </div>
        )}

        {/* Configurações */}
        {mostrarConfiguracoes && configuracoes && (
          <div className="configuracoes-container">
            <h3>Configurações de Notificações</h3>
            <div className="config-section">
              <div className="config-item">
                <label>
                  <input
                    type="checkbox"
                    checked={configuracoes.emailNotificacoes}
                    onChange={(e) =>
                      setConfiguracoes({
                        ...configuracoes,
                        emailNotificacoes: e.target.checked,
                      })
                    }
                  />
                  Receber notificações por e-mail
                </label>
              </div>
              {configuracoes.emailNotificacoes && (
                <>
                  <div className="config-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={configuracoes.emailDocumentoVencendo}
                        onChange={(e) =>
                          setConfiguracoes({
                            ...configuracoes,
                            emailDocumentoVencendo: e.target.checked,
                          })
                        }
                      />
                      Documentos vencendo
                    </label>
                  </div>
                  <div className="config-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={configuracoes.emailDocumentoVencido}
                        onChange={(e) =>
                          setConfiguracoes({
                            ...configuracoes,
                            emailDocumentoVencido: e.target.checked,
                          })
                        }
                      />
                      Documentos vencidos
                    </label>
                  </div>
                  <div className="config-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={configuracoes.emailPremioLancado}
                        onChange={(e) =>
                          setConfiguracoes({
                            ...configuracoes,
                            emailPremioLancado: e.target.checked,
                          })
                        }
                      />
                      Prêmios lançados
                    </label>
                  </div>
                  <div className="config-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={configuracoes.emailBoletimPendente}
                        onChange={(e) =>
                          setConfiguracoes({
                            ...configuracoes,
                            emailBoletimPendente: e.target.checked,
                          })
                        }
                      />
                      Boletins pendentes
                    </label>
                  </div>
                </>
              )}
              <div className="config-item">
                <label>
                  Alertar com quantos dias de antecedência:
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={configuracoes.diasAntesVencimento}
                    onChange={(e) =>
                      setConfiguracoes({
                        ...configuracoes,
                        diasAntesVencimento: parseInt(e.target.value) || 7,
                      })
                    }
                  />
                </label>
              </div>
              <div className="config-item">
                <label>
                  Hora da verificação diária:
                  <input
                    type="time"
                    value={configuracoes.horaVerificacao}
                    onChange={(e) =>
                      setConfiguracoes({
                        ...configuracoes,
                        horaVerificacao: e.target.value,
                      })
                    }
                  />
                </label>
              </div>
              <div className="config-item config-item-test-email">
                <button
                  type="button"
                  className="btn-test-email"
                  onClick={handleEnviarTestEmail}
                  disabled={testEmailLoading}
                  aria-busy={testEmailLoading}
                  aria-label="Enviar e-mail de teste para o endereço da sua conta"
                >
                  <HiMail className="btn-test-email-icon" />
                  {testEmailLoading ? "Enviando…" : "Enviar e-mail de teste"}
                </button>
                <span className="config-test-email-hint">
                  Envia um e-mail de teste para {user?.email || "seu e-mail"} para verificar se as notificações por e-mail estão ativas.
                </span>
              </div>
            </div>
            <div className="config-actions">
              <button
                className="btn-secondary"
                onClick={() => setMostrarConfiguracoes(false)}
              >
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={handleSalvarConfiguracoes}
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        )}

        {/* Ações em massa */}
        {notificacoesFiltradas.length > 0 && (
          <div className="acoes-massa">
            {naoLidas > 0 && (
              <button
                className="btn-action"
                onClick={() => marcarTodasComoLidas()}
              >
                <HiCheckCircle />
                Marcar todas como lidas
              </button>
            )}
            <button
              className="btn-action danger"
              onClick={() => deletarTodasLidas()}
            >
              <HiTrash />
              Deletar lidas
            </button>
          </div>
        )}

        {/* Lista de notificações */}
        <div className="notificacoes-lista">
          {notificacoesFiltradas.length === 0 ? (
            <div className="empty-state">
              <HiInformationCircle />
              <h3>Nenhuma notificação encontrada</h3>
              <p>
                {filtroTipo !== "todos" ||
                filtroPrioridade !== "todos" ||
                filtroLida !== "todos"
                  ? "Tente ajustar os filtros"
                  : "Você não tem notificações no momento"}
              </p>
            </div>
          ) : (
            notificacoesFiltradas.map((notificacao) => (
              <div
                key={notificacao.id}
                className={`notificacao-card ${
                  !notificacao.lida ? "unread" : ""
                } ${getPriorityClass(notificacao.prioridade)}`}
                onClick={() =>
                  handleNotificationClick(notificacao.id, notificacao.link)
                }
              >
                <div className="notificacao-icon">
                  {getNotificationIcon(notificacao.tipo)}
                </div>
                <div className="notificacao-body">
                  <div className="notificacao-header">
                    <h3 className="notificacao-titulo">{notificacao.titulo}</h3>
                    <div className="notificacao-badges">
                      <span
                        className={`badge ${getPriorityClass(
                          notificacao.prioridade
                        )}`}
                      >
                        {getPriorityLabel(notificacao.prioridade)}
                      </span>
                      <span className="badge tipo">
                        {getTipoLabel(notificacao.tipo)}
                      </span>
                    </div>
                  </div>
                  <p className="notificacao-mensagem">{notificacao.mensagem}</p>
                  <div className="notificacao-footer">
                    <span className="notificacao-tempo">
                      {formatarTempo(notificacao.criadoEm)}
                    </span>
                    {notificacao.emailEnviado && (
                      <span className="email-sent">
                        <HiMail className="email-icon" /> E-mail enviado
                      </span>
                    )}
                    {isDocumentNotification(notificacao.tipo) && (
                      <WhatsAppButton
                        variant="link"
                        label="WhatsApp RH"
                        message={buildSupportMessage(
                          `${notificacao.titulo}\n${notificacao.mensagem}`
                        )}
                        className="notificacao-whatsapp-link"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </div>
                </div>
                <button
                  className="btn-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    deletar(notificacao.id);
                  }}
                >
                  <HiX />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Notificacoes;
