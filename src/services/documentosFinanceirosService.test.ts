import type { NotaFiscalFormData } from "../types/documentosFinanceiros";
import { vi } from "vitest";

vi.mock("../lib/firebaseconfig", () => ({
  db: {},
}));

describe("documentosFinanceirosService", () => {
  const notaForm = (): NotaFiscalFormData => ({
    numero: "NF-001",
    fornecedor: "Fornecedor XPTO",
    valor: 450,
    dataEmissao: new Date("2026-04-01"),
    tipo: "entrada",
    categoria: "Servico",
    arquivo: new File(["conteudo"], "nota.pdf", { type: "application/pdf" }),
  });

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "");
    localStorage.clear();
  });

  it("cria nota fiscal local quando firebase nao configurado", async () => {
    const { documentosFinanceirosService } = await import("./documentosFinanceirosService");

    const nota = await documentosFinanceirosService.criarNotaFiscal(notaForm(), "user-1");

    expect(nota.id.startsWith("local-")).toBe(true);
    expect(nota.status).toBe("pendente");
  });

  it("lista e filtra notas locais por busca", async () => {
    const { documentosFinanceirosService } = await import("./documentosFinanceirosService");

    await documentosFinanceirosService.criarNotaFiscal(notaForm(), "user-1");

    const notas = await documentosFinanceirosService.listarNotasFiscais({ busca: "NF-001" });

    expect(notas).toHaveLength(1);
    expect(notas[0].numero).toBe("NF-001");
  });
});
