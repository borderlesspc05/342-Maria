import type { Notificacao } from "../types/notificacao";
import { vi } from "vitest";

vi.mock("../lib/firebaseconfig", () => ({
  db: {},
  auth: { currentUser: null },
}));

vi.mock("./emailNotificationService", () => ({
  emailNotificationService: {
    sendForNotificationIfEnabled: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("notificacaoService", () => {
  it("calcula estatisticas por tipo e prioridade", async () => {
    const { notificacaoService } = await import("./notificacaoService");

    const dados: Notificacao[] = [
      {
        id: "1",
        userId: "u1",
        tipo: "documento_vencendo",
        prioridade: "alta",
        titulo: "Doc 1",
        mensagem: "Mensagem",
        lida: false,
        emailEnviado: false,
        criadoEm: new Date(),
      },
      {
        id: "2",
        userId: "u1",
        tipo: "sistema",
        prioridade: "baixa",
        titulo: "Sistema",
        mensagem: "Mensagem",
        lida: true,
        emailEnviado: true,
        criadoEm: new Date(),
      },
    ];

    vi.spyOn(notificacaoService, "listarPorUsuario").mockResolvedValue(dados);

    const stats = await notificacaoService.obterEstatisticas("u1");

    expect(stats.total).toBe(2);
    expect(stats.naoLidas).toBe(1);
    expect(stats.porTipo.documento_vencendo).toBe(1);
    expect(stats.porTipo.sistema).toBe(1);
    expect(stats.porPrioridade.alta).toBe(1);
    expect(stats.porPrioridade.baixa).toBe(1);
  });
});
