import type { TransacaoFormData } from "../types/financeiro";
import { vi } from "vitest";

vi.mock("../lib/firebaseconfig", () => ({
  db: {},
  auth: {
    currentUser: {
      uid: "user-1",
      email: "user-1@test.local",
    },
  },
}));

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

    await financeiroService.updateStatus(id, "Pago", "admin-1", "PIX", "PIX-01", "ok");

    const raw = localStorage.getItem("financeiro_transacoes_local:user-1");
    const transacoes = raw ? (JSON.parse(raw) as Array<Record<string, unknown>>) : [];
    const atualizada = transacoes.find((t) => t.id === id);

    expect(atualizada?.status).toBe("Pago");
    expect(atualizada?.formaPagamento).toBe("PIX");
    expect(atualizada?.numeroComprovante).toBe("PIX-01");
  });
});
