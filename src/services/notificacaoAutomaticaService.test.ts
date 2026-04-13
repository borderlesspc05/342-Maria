import { vi } from "vitest";

const mockDeps = vi.hoisted(() => ({
  notificacaoService: {
    obterConfiguracoes: vi.fn(),
    notificarDocumentoVencido: vi.fn(),
    notificarDocumentoVencendo: vi.fn(),
    notificarBoletimPendente: vi.fn(),
    notificarBoletimVencendo: vi.fn(),
    listarPorUsuario: vi.fn(),
    notificarPremioLancado: vi.fn(),
    deduplicarRepetidas: vi.fn(),
    deletar: vi.fn(),
    obterEstatisticas: vi.fn(),
  },
  documentacoesService: {
    list: vi.fn(),
  },
  boletimMedicaoService: {
    getAll: vi.fn(),
  },
  premioProdutividadeService: {
    list: vi.fn(),
  },
}));

vi.mock("./notificacaoService", () => ({
  notificacaoService: mockDeps.notificacaoService,
}));

vi.mock("./documentacoesService", () => ({
  documentacoesService: mockDeps.documentacoesService,
}));

vi.mock("./boletimMedicaoService", () => ({
  boletimMedicaoService: mockDeps.boletimMedicaoService,
}));

vi.mock("./premioProdutividadeService", () => ({
  premioProdutividadeService: mockDeps.premioProdutividadeService,
}));

describe("notificacaoAutomaticaService", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-13T12:00:00.000Z"));

    mockDeps.notificacaoService.obterConfiguracoes.mockResolvedValue({
      diasAntesVencimento: 7,
    });
    mockDeps.notificacaoService.listarPorUsuario.mockResolvedValue([]);
    mockDeps.notificacaoService.obterEstatisticas.mockResolvedValue({
      total: 5,
      naoLidas: 2,
      porTipo: { sistema: 2 },
      porPrioridade: { alta: 1 },
    });
    mockDeps.documentacoesService.list.mockResolvedValue([]);
    mockDeps.boletimMedicaoService.getAll.mockResolvedValue([]);
    mockDeps.premioProdutividadeService.list.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("envia alertas de documento vencido e vencendo quando aplicável", async () => {
    mockDeps.documentacoesService.list.mockResolvedValue([
      {
        id: "d1",
        colaboradorId: "c1",
        colaboradorNome: "Maria",
        tipoDocumento: "ASO",
        dataValidade: new Date("2026-04-10"),
        status: "Vencido",
      },
      {
        id: "d2",
        colaboradorId: "c2",
        colaboradorNome: "Ana",
        tipoDocumento: "NR35",
        dataValidade: new Date("2026-04-16"),
        status: "Válido",
      },
    ]);

    const { notificacaoAutomaticaService } = await import("./notificacaoAutomaticaService");

    const promise = notificacaoAutomaticaService.verificarDocumentos("u1");
    await vi.runAllTimersAsync();
    await promise;

    expect(mockDeps.notificacaoService.notificarDocumentoVencido).toHaveBeenCalledTimes(1);
    expect(mockDeps.notificacaoService.notificarDocumentoVencendo).toHaveBeenCalledTimes(1);
  });

  it("não envia alerta de documento quando já houve aviso nas últimas 24h", async () => {
    mockDeps.documentacoesService.list.mockResolvedValue([
      {
        id: "d1",
        colaboradorId: "c1",
        colaboradorNome: "Maria",
        tipoDocumento: "ASO",
        dataValidade: new Date("2026-04-12"),
        dataAlerta: new Date("2026-04-13T03:00:00.000Z"),
        status: "Vencido",
      },
    ]);

    const { notificacaoAutomaticaService } = await import("./notificacaoAutomaticaService");

    const promise = notificacaoAutomaticaService.verificarDocumentos("u1");
    await vi.runAllTimersAsync();
    await promise;

    expect(mockDeps.notificacaoService.notificarDocumentoVencido).not.toHaveBeenCalled();
    expect(mockDeps.notificacaoService.notificarDocumentoVencendo).not.toHaveBeenCalled();
  });

  it("notifica boletim pendente e boletim vencendo", async () => {
    mockDeps.boletimMedicaoService.getAll.mockResolvedValue([
      {
        id: "b1",
        cliente: "Cliente A",
        numero: "001",
        valor: 1000,
        status: "Pendente",
      },
      {
        id: "b2",
        cliente: "Cliente B",
        numero: "002",
        valor: 2000,
        status: "Aguardando assinatura",
        dataVencimento: new Date("2026-04-18"),
      },
      {
        id: "b3",
        cliente: "Cliente C",
        numero: "003",
        valor: 3000,
        status: "Emitido",
        dataVencimento: new Date("2026-04-18"),
      },
    ]);

    const { notificacaoAutomaticaService } = await import("./notificacaoAutomaticaService");

    const promise = notificacaoAutomaticaService.verificarBoletins("u1");
    await vi.runAllTimersAsync();
    await promise;

    expect(mockDeps.notificacaoService.notificarBoletimPendente).toHaveBeenCalledTimes(1);
    expect(mockDeps.notificacaoService.notificarBoletimVencendo).toHaveBeenCalledTimes(1);
  });

  it("notifica prêmio recente quando ainda não houve notificação", async () => {
    mockDeps.premioProdutividadeService.list.mockResolvedValue([
      {
        id: "p1",
        colaboradorNome: "Maria",
        valor: 500,
        motivo: "Meta",
        criadoEm: new Date("2026-04-10"),
      },
      {
        id: "p2",
        colaboradorNome: "Ana",
        valor: 200,
        motivo: "Bônus",
        criadoEm: new Date("2026-03-20"),
      },
    ]);

    const { notificacaoAutomaticaService } = await import("./notificacaoAutomaticaService");

    const promise = notificacaoAutomaticaService.verificarPremios("u1");
    await vi.runAllTimersAsync();
    await promise;

    expect(mockDeps.notificacaoService.notificarPremioLancado).toHaveBeenCalledTimes(1);
    expect(mockDeps.notificacaoService.notificarPremioLancado).toHaveBeenCalledWith(
      "u1",
      "p1",
      "Maria",
      500,
      "Meta"
    );
  });

  it("não duplica notificação de prêmio já notificado", async () => {
    mockDeps.premioProdutividadeService.list.mockResolvedValue([
      {
        id: "p1",
        colaboradorNome: "Maria",
        valor: 500,
        motivo: "Meta",
        criadoEm: new Date("2026-04-10"),
      },
    ]);

    mockDeps.notificacaoService.listarPorUsuario.mockResolvedValue([
      { id: "n1", metadata: { premioId: "p1" } },
    ]);

    const { notificacaoAutomaticaService } = await import("./notificacaoAutomaticaService");

    const promise = notificacaoAutomaticaService.verificarPremios("u1");
    await vi.runAllTimersAsync();
    await promise;

    expect(mockDeps.notificacaoService.notificarPremioLancado).not.toHaveBeenCalled();
  });

  it("executa verificação completa em sequência", async () => {
    const { notificacaoAutomaticaService } = await import("./notificacaoAutomaticaService");

    const spyDocs = vi
      .spyOn(notificacaoAutomaticaService, "verificarDocumentos")
      .mockResolvedValue(undefined);
    const spyBoletins = vi
      .spyOn(notificacaoAutomaticaService, "verificarBoletins")
      .mockResolvedValue(undefined);
    const spyPremios = vi
      .spyOn(notificacaoAutomaticaService, "verificarPremios")
      .mockResolvedValue(undefined);

    const promise = notificacaoAutomaticaService.executarVerificacaoCompleta("u1");
    await vi.runAllTimersAsync();
    await promise;

    expect(mockDeps.notificacaoService.deduplicarRepetidas).toHaveBeenCalledWith("u1", 24);
    expect(spyDocs).toHaveBeenCalledWith("u1");
    expect(spyBoletins).toHaveBeenCalledWith("u1");
    expect(spyPremios).toHaveBeenCalledWith("u1");
  });

  it("inicia e cancela verificação periódica", async () => {
    const { notificacaoAutomaticaService } = await import("./notificacaoAutomaticaService");

    const execSpy = vi
      .spyOn(notificacaoAutomaticaService, "executarVerificacaoCompleta")
      .mockResolvedValue(undefined);

    const stop = notificacaoAutomaticaService.iniciarVerificacaoPeriodica("u1", 1);
    await Promise.resolve();
    expect(execSpy).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(60_000);
    await Promise.resolve();
    expect(execSpy).toHaveBeenCalledTimes(2);

    stop();
    await vi.advanceTimersByTimeAsync(120_000);
    await Promise.resolve();
    expect(execSpy).toHaveBeenCalledTimes(2);
  });

  it("limpa notificações antigas já lidas", async () => {
    mockDeps.notificacaoService.listarPorUsuario.mockResolvedValue([
      { id: "n1", lida: true, criadoEm: new Date("2026-03-01") },
      { id: "n2", lida: false, criadoEm: new Date("2026-03-01") },
      { id: "n3", lida: true, criadoEm: new Date("2026-04-10") },
    ]);

    const { notificacaoAutomaticaService } = await import("./notificacaoAutomaticaService");

    await notificacaoAutomaticaService.limparNotificacoesAntigas("u1");

    expect(mockDeps.notificacaoService.deletar).toHaveBeenCalledTimes(1);
    expect(mockDeps.notificacaoService.deletar).toHaveBeenCalledWith("n1");
  });

  it("gera relatório agregando estatísticas e últimas notificações", async () => {
    const ultimas = [{ id: "n1" }, { id: "n2" }];
    mockDeps.notificacaoService.listarPorUsuario.mockResolvedValue(ultimas);

    const { notificacaoAutomaticaService } = await import("./notificacaoAutomaticaService");

    const relatorio = await notificacaoAutomaticaService.gerarRelatorio("u1");

    expect(relatorio).toEqual({
      totalNotificacoes: 5,
      naoLidas: 2,
      porTipo: { sistema: 2 },
      porPrioridade: { alta: 1 },
      ultimasNotificacoes: ultimas,
    });
  });
});
