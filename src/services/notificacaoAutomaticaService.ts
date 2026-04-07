import { notificacaoService } from "./notificacaoService";
import { documentacoesService } from "./documentacoesService";
import { boletimMedicaoService } from "./boletimMedicaoService";
import { premioProdutividadeService } from "./premioProdutividadeService";

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const NOTIFICATION_DELAY_MS = 2000;

export const notificacaoAutomaticaService = {
  async verificarDocumentos(userId: string): Promise<void> {
    try {
      const configuracoes = await notificacaoService.obterConfiguracoes(userId);
      const diasAntesVencimento = configuracoes.diasAntesVencimento || 7;
      const documentos = await documentacoesService.list();

      const agora = new Date();
      const dataLimiteVencendo = new Date();
      dataLimiteVencendo.setDate(
        dataLimiteVencendo.getDate() + diasAntesVencimento
      );

      for (const documento of documentos) {
        const dataValidade = new Date(documento.dataValidade);

        if (dataValidade < agora && documento.status === "Vencido") {
          if (
            !documento.dataAlerta ||
            new Date().getTime() - new Date(documento.dataAlerta).getTime() >
              24 * 60 * 60 * 1000
          ) {
            await notificacaoService.notificarDocumentoVencido(
              userId,
              documento.id,
              documento.colaboradorNome,
              documento.tipoDocumento,
              dataValidade
            );
            await delay(NOTIFICATION_DELAY_MS);
          }
        } else if (
          dataValidade > agora &&
          dataValidade <= dataLimiteVencendo &&
          (documento.status === "Vencendo" || documento.status === "Válido")
        ) {
          if (
            !documento.dataAlerta ||
            new Date().getTime() - new Date(documento.dataAlerta).getTime() >
              24 * 60 * 60 * 1000
          ) {
            await notificacaoService.notificarDocumentoVencendo(
              userId,
              documento.id,
              documento.colaboradorNome,
              documento.tipoDocumento,
              dataValidade
            );
            await delay(NOTIFICATION_DELAY_MS);
          }
        }
      }
    } catch (error) {
      console.error("Erro ao verificar documentos:", error);
    }
  },

  async verificarBoletins(userId: string): Promise<void> {
    try {
      const boletins = await boletimMedicaoService.getAll();

      const agora = new Date();
      const dataLimiteVencendo = new Date();
      dataLimiteVencendo.setDate(dataLimiteVencendo.getDate() + 7);

      for (const boletim of boletins) {
        if (boletim.status === "Pendente") {
          await notificacaoService.notificarBoletimPendente(
            userId,
            boletim.id,
            boletim.cliente,
            boletim.numero,
            boletim.valor
          );
          await delay(NOTIFICATION_DELAY_MS);
        }

        if (boletim.dataVencimento) {
          const dataVencimento = new Date(boletim.dataVencimento);

          if (
            dataVencimento > agora &&
            dataVencimento <= dataLimiteVencendo &&
            boletim.status !== "Emitido"
          ) {
            await notificacaoService.notificarBoletimVencendo(
              userId,
              boletim.id,
              boletim.cliente,
              boletim.numero,
              dataVencimento
            );
            await delay(NOTIFICATION_DELAY_MS);
          }
        }
      }
    } catch (error) {
      console.error("Erro ao verificar boletins:", error);
    }
  },

  async verificarPremios(userId: string): Promise<void> {
    try {
      const premios = await premioProdutividadeService.list();

      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

      for (const premio of premios) {
        const dataCriacao = new Date(premio.criadoEm);

        if (dataCriacao >= seteDiasAtras) {
          const notificacoesExistentes =
            await notificacaoService.listarPorUsuario(userId, {
              tipo: "premio_lancado",
            });

          const jaNotificado = notificacoesExistentes.some(
            (n) => n.metadata?.premioId === premio.id
          );

          if (!jaNotificado) {
            await notificacaoService.notificarPremioLancado(
              userId,
              premio.id,
              premio.colaboradorNome,
              premio.valor,
              premio.motivo
            );
            await delay(NOTIFICATION_DELAY_MS);
          }
        }
      }
    } catch (error) {
      console.error("Erro ao verificar prêmios:", error);
    }
  },

  async executarVerificacaoCompleta(userId: string): Promise<void> {
    console.log("Iniciando verificação automática de notificações...");

    try {
      await notificacaoService.deduplicarRepetidas(userId, 24);
      await delay(NOTIFICATION_DELAY_MS);

      await this.verificarDocumentos(userId);
      await delay(NOTIFICATION_DELAY_MS);

      await this.verificarBoletins(userId);
      await delay(NOTIFICATION_DELAY_MS);

      await this.verificarPremios(userId);

      console.log("Verificação automática concluída com sucesso");
    } catch (error) {
      console.error("Erro na verificação automática:", error);
    }
  },

  iniciarVerificacaoPeriodica(
    userId: string,
    intervalMinutos: number = 60
  ): () => void {
    console.log(
      `Iniciando verificação periódica a cada ${intervalMinutos} minutos`
    );

    this.executarVerificacaoCompleta(userId);

    const intervalId = setInterval(() => {
      this.executarVerificacaoCompleta(userId);
    }, intervalMinutos * 60 * 1000);

    return () => {
      console.log("Cancelando verificação periódica");
      clearInterval(intervalId);
    };
  },

  async verificarDocumentosColaborador(
    userId: string,
    colaboradorId: string
  ): Promise<void> {
    try {
      const configuracoes = await notificacaoService.obterConfiguracoes(userId);
      const diasAntesVencimento = configuracoes.diasAntesVencimento || 7;

      const documentos = await documentacoesService.list({
        colaboradorNome: undefined,
      });

      const documentosColaborador = documentos.filter(
        (d: { colaboradorId: string }) => d.colaboradorId === colaboradorId
      );

      const agora = new Date();
      const dataLimiteVencendo = new Date();
      dataLimiteVencendo.setDate(
        dataLimiteVencendo.getDate() + diasAntesVencimento
      );

      for (const documento of documentosColaborador) {
        const dataValidade = new Date(documento.dataValidade);

        if (dataValidade < agora && documento.status === "Vencido") {
          await notificacaoService.notificarDocumentoVencido(
            userId,
            documento.id,
            documento.colaboradorNome,
            documento.tipoDocumento,
            dataValidade
          );
          await delay(NOTIFICATION_DELAY_MS);
        } else if (dataValidade > agora && dataValidade <= dataLimiteVencendo) {
          await notificacaoService.notificarDocumentoVencendo(
            userId,
            documento.id,
            documento.colaboradorNome,
            documento.tipoDocumento,
            dataValidade
          );
          await delay(NOTIFICATION_DELAY_MS);
        }
      }
    } catch (error) {
      console.error("Erro ao verificar documentos do colaborador:", error);
    }
  },

  async limparNotificacoesAntigas(userId: string): Promise<void> {
    try {
      const notificacoes = await notificacaoService.listarPorUsuario(userId);

      const trintaDiasAtras = new Date();
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

      const notificacoesAntigas = notificacoes.filter(
        (n) => n.lida && new Date(n.criadoEm) < trintaDiasAtras
      );

      for (const notificacao of notificacoesAntigas) {
        await notificacaoService.deletar(notificacao.id);
      }

      console.log(
        `${notificacoesAntigas.length} notificações antigas foram removidas`
      );
    } catch (error) {
      console.error("Erro ao limpar notificações antigas:", error);
    }
  },

  async gerarRelatorio(userId: string): Promise<{
    totalNotificacoes: number;
    naoLidas: number;
    porTipo: Record<string, number>;
    porPrioridade: Record<string, number>;
    ultimasNotificacoes: unknown[];
  }> {
    try {
      const stats = await notificacaoService.obterEstatisticas(userId);
      const notificacoes = await notificacaoService.listarPorUsuario(
        userId,
        undefined,
        10
      );

      return {
        totalNotificacoes: stats.total,
        naoLidas: stats.naoLidas,
        porTipo: stats.porTipo,
        porPrioridade: stats.porPrioridade,
        ultimasNotificacoes: notificacoes,
      };
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      throw error;
    }
  },
};
