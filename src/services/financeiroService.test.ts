import type { TransacaoFormData } from "../types/financeiro";
import { vi } from "vitest";

const firestoreMocks = vi.hoisted(() => {
  const fixedNow = new Date("2026-04-10T12:00:00.000Z");

  return {
    addDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    getDocs: vi.fn(),
    getDoc: vi.fn(),
    collection: vi.fn((...args: unknown[]) => ({ args })),
    doc: vi.fn((...args: unknown[]) => ({ args })),
    query: vi.fn((...args: unknown[]) => ({ args })),
    where: vi.fn((...args: unknown[]) => ({ args })),
    orderBy: vi.fn((...args: unknown[]) => ({ args })),
    Timestamp: {
      fromDate: vi.fn((date: Date) => ({ __type: "fromDate", date })),
      now: vi.fn(() => ({ __type: "now", at: fixedNow })),
    },
  };
});

vi.mock("../lib/firebaseconfig", () => ({
  db: {},
  auth: {
    currentUser: {
      uid: "user-1",
      email: "user-1@test.local",
    },
  },
}));

vi.mock("firebase/firestore", () => firestoreMocks);

vi.mock("./securityService", () => ({
  assertRole: vi.fn().mockResolvedValue({ uid: "user-1", role: "admin" }),
  validatePositiveNumber: (value: unknown) => Number(value),
  validateRequiredString: (value: unknown) => String(value).trim(),
}));

describe("financeiroService", () => {
  const baseFormData: TransacaoFormData = {
    colaboradorId: "col-1",
    colaboradorNome: "Maria",
    cpf: "000.000.000-00",
    cargo: "Analista",
    setor: "RH",
    tipoTransacao: "Pagamento",
    categoria: "Salário",
    valor: 2200,
    descricao: "Salario mensal",
    dataVencimento: new Date("2026-04-10"),
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "");
    localStorage.clear();
  });

  it("cria transacao local quando firebase nao configurado", async () => {
    const { financeiroService } = await import("./financeiroService");

    const id = await financeiroService.create(baseFormData, "admin-1");

    expect(id.startsWith("local-")).toBe(true);

    const saved = localStorage.getItem("financeiro_transacoes_local:user-1");
    expect(saved).toBeTruthy();
  });

  it("atualiza status para pago no modo local", async () => {
    const { financeiroService } = await import("./financeiroService");
    const id = await financeiroService.create(baseFormData, "admin-1");

    await financeiroService.updateStatus(
      id,
      "Pago",
      "admin-1",
      "PIX",
      "PIX-01",
      "ok"
    );

    const raw = localStorage.getItem("financeiro_transacoes_local:user-1");
    const transacoes = raw ? (JSON.parse(raw) as Array<Record<string, unknown>>) : [];
    const atualizada = transacoes.find((t) => t.id === id);

    expect(atualizada?.status).toBe("Pago");
    expect(atualizada?.formaPagamento).toBe("PIX");
    expect(atualizada?.numeroComprovante).toBe("PIX-01");
  });

  it("cria transacao no Firebase quando configurado", async () => {
    vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "demo-project");
    firestoreMocks.addDoc.mockResolvedValue({ id: "firebase-1" });

    const { financeiroService } = await import("./financeiroService");
    const id = await financeiroService.create(baseFormData, "admin-1");

    expect(id).toBe("firebase-1");
    expect(firestoreMocks.Timestamp.fromDate).toHaveBeenCalledWith(
      baseFormData.dataVencimento
    );
    expect(firestoreMocks.addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        colaboradorId: baseFormData.colaboradorId,
        colaboradorNome: baseFormData.colaboradorNome,
        status: "Pendente",
        dataVencimento: expect.objectContaining({
          __type: "fromDate",
          date: baseFormData.dataVencimento,
        }),
      })
    );
  });

  it("aplica campos derivados ao aprovar transacao no Firebase", async () => {
    vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "demo-project");
    firestoreMocks.updateDoc.mockResolvedValue(undefined);

    const { financeiroService } = await import("./financeiroService");

    await financeiroService.updateStatus("tx-1", "Aprovado", "admin-1");

    expect(firestoreMocks.doc).toHaveBeenCalledWith(
      expect.anything(),
      "transacoes_financeiras",
      "tx-1"
    );
    expect(firestoreMocks.Timestamp.now).toHaveBeenCalled();
    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "Aprovado",
        aprovadoPor: "admin-1",
        aprovadoEm: expect.objectContaining({ __type: "now" }),
        atualizadoEm: expect.objectContaining({ __type: "now" }),
      })
    );
  });

  it("aplica campos de pagamento ao concluir transacao no Firebase", async () => {
    vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "demo-project");
    firestoreMocks.updateDoc.mockResolvedValue(undefined);

    const { financeiroService } = await import("./financeiroService");

    await financeiroService.updateStatus(
      "tx-2",
      "Pago",
      "admin-1",
      "PIX",
      "COMP-1",
      "Pagamento confirmado"
    );

    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "Pago",
        pagoPor: "admin-1",
        formaPagamento: "PIX",
        numeroComprovante: "COMP-1",
        observacoes: "Pagamento confirmado",
      })
    );
  });
});
