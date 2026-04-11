import type { Notificacao } from "../types/notificacao";
import { vi } from "vitest";

const firestoreMocks = vi.hoisted(() => {
  const fixedNow = new Date("2026-04-10T12:00:00.000Z");

  return {
    addDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    collection: vi.fn((...args: unknown[]) => ({ args })),
    doc: vi.fn((...args: unknown[]) => ({ args })),
    query: vi.fn((...args: unknown[]) => ({ args })),
    where: vi.fn((...args: unknown[]) => ({ args })),
    orderBy: vi.fn((...args: unknown[]) => ({ args })),
    limit: vi.fn((...args: unknown[]) => ({ args })),
    onSnapshot: vi.fn(),
    writeBatch: vi.fn(),
    Timestamp: {
      fromDate: vi.fn((date: Date) => ({ __type: "fromDate", date })),
      now: vi.fn(() => ({ __type: "now", at: fixedNow })),
    },
  };
});

const emailNotificationMocks = vi.hoisted(() => ({
  sendForNotificationIfEnabled: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/firebaseconfig", () => ({
  db: {},
  auth: {
    currentUser: {
      uid: "u1",
      email: "u1@test.local",
    },
  },
}));

vi.mock("firebase/firestore", () => firestoreMocks);

vi.mock("./securityService", () => ({
  assertAuthenticated: vi.fn().mockResolvedValue("u1"),
  assertOwnerOrRole: vi.fn().mockResolvedValue({ uid: "u1", role: "admin" }),
  assertRole: vi.fn().mockResolvedValue({ uid: "u1", role: "admin" }),
}));

vi.mock("./emailNotificationService", () => ({
  emailNotificationService: emailNotificationMocks,
}));

describe("notificacaoService", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("cria notificação e dispara envio de e-mail quando habilitado", async () => {
    firestoreMocks.addDoc.mockResolvedValue({ id: "notif-1" });

    const { notificacaoService } = await import("./notificacaoService");

    const notificacao = await notificacaoService.criar({
      userId: "u1",
      tipo: "sistema",
      prioridade: "alta",
      titulo: "Nova tarefa",
      mensagem: "Há uma pendência no sistema.",
      metadata: { recurso: "dashboard" },
    });

    expect(notificacao.id).toBe("notif-1");
    expect(firestoreMocks.addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: "u1",
        lida: false,
        emailEnviado: false,
        criadoEm: expect.any(Date),
      })
    );
    expect(emailNotificationMocks.sendForNotificationIfEnabled).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "notif-1",
        userId: "u1",
        tipo: "sistema",
        prioridade: "alta",
      }),
      "u1@test.local",
      "u1"
    );
  });

  it("marca notificação como lida", async () => {
    firestoreMocks.updateDoc.mockResolvedValue(undefined);

    const { notificacaoService } = await import("./notificacaoService");

    await notificacaoService.marcarComoLida("notif-1");

    expect(firestoreMocks.doc).toHaveBeenCalledWith(
      expect.anything(),
      "notificacoes",
      "notif-1"
    );
    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        lida: true,
        lidoEm: expect.any(Date),
      })
    );
  });

  it("marca todas como lidas em lote", async () => {
    const batchUpdate = vi.fn();
    const batchCommit = vi.fn().mockResolvedValue(undefined);
    firestoreMocks.writeBatch.mockReturnValue({
      update: batchUpdate,
      commit: batchCommit,
    });
    firestoreMocks.getDocs.mockResolvedValue({
      docs: [
        { ref: { id: "n1" }, data: () => ({ lida: false }) },
        { ref: { id: "n3" }, data: () => ({ lida: false }) },
      ],
    });

    const { notificacaoService } = await import("./notificacaoService");

    await notificacaoService.marcarTodasComoLidas("u1");

    expect(batchUpdate).toHaveBeenCalledTimes(2);
    expect(batchUpdate).toHaveBeenNthCalledWith(1, { id: "n1" }, expect.objectContaining({ lida: true }));
    expect(batchUpdate).toHaveBeenNthCalledWith(2, { id: "n3" }, expect.objectContaining({ lida: true }));
    expect(batchCommit).toHaveBeenCalledTimes(1);
  });

  it("calcula estatisticas completas por tipo e prioridade", async () => {
    const { notificacaoService } = await import("./notificacaoService");

    const baseDate = new Date("2026-04-10T10:00:00.000Z");
    const dados: Notificacao[] = [
      {
        id: "1",
        userId: "u1",
        tipo: "documento_vencendo",
        prioridade: "baixa",
        titulo: "Doc 1",
        mensagem: "Mensagem",
        lida: false,
        emailEnviado: false,
        criadoEm: baseDate,
      },
      {
        id: "2",
        userId: "u1",
        tipo: "documento_vencido",
        prioridade: "media",
        titulo: "Doc 2",
        mensagem: "Mensagem",
        lida: true,
        emailEnviado: false,
        criadoEm: new Date(baseDate.getTime() + 1000),
      },
      {
        id: "3",
        userId: "u1",
        tipo: "premio_lancado",
        prioridade: "alta",
        titulo: "Prêmio",
        mensagem: "Mensagem",
        lida: false,
        emailEnviado: true,
        criadoEm: new Date(baseDate.getTime() + 2000),
      },
      {
        id: "4",
        userId: "u1",
        tipo: "boletim_pendente",
        prioridade: "urgente",
        titulo: "Boletim",
        mensagem: "Mensagem",
        lida: true,
        emailEnviado: true,
        criadoEm: new Date(baseDate.getTime() + 3000),
      },
      {
        id: "5",
        userId: "u1",
        tipo: "boletim_vencendo",
        prioridade: "baixa",
        titulo: "Boletim 2",
        mensagem: "Mensagem",
        lida: false,
        emailEnviado: false,
        criadoEm: new Date(baseDate.getTime() + 4000),
      },
      {
        id: "6",
        userId: "u1",
        tipo: "sistema",
        prioridade: "media",
        titulo: "Sistema",
        mensagem: "Mensagem",
        lida: true,
        emailEnviado: false,
        criadoEm: new Date(baseDate.getTime() + 5000),
      },
      {
        id: "7",
        userId: "u1",
        tipo: "outro",
        prioridade: "alta",
        titulo: "Outro",
        mensagem: "Mensagem",
        lida: false,
        emailEnviado: false,
        criadoEm: new Date(baseDate.getTime() + 6000),
      },
    ];

    vi.spyOn(notificacaoService, "listarPorUsuario").mockResolvedValue(dados);

    const stats = await notificacaoService.obterEstatisticas("u1");

    expect(stats.total).toBe(7);
    expect(stats.naoLidas).toBe(4);
    expect(stats.porTipo.documento_vencendo).toBe(1);
    expect(stats.porTipo.documento_vencido).toBe(1);
    expect(stats.porTipo.premio_lancado).toBe(1);
    expect(stats.porTipo.boletim_pendente).toBe(1);
    expect(stats.porTipo.boletim_vencendo).toBe(1);
    expect(stats.porTipo.sistema).toBe(1);
    expect(stats.porTipo.outro).toBe(1);
    expect(stats.porPrioridade.baixa).toBe(2);
    expect(stats.porPrioridade.media).toBe(2);
    expect(stats.porPrioridade.alta).toBe(2);
    expect(stats.porPrioridade.urgente).toBe(1);
  });
});
