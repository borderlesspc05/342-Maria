import { vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: {
    currentUser: {
      uid: "u1",
    } as { uid?: string } | null,
  },
  getDoc: vi.fn(),
  doc: vi.fn((...args: unknown[]) => ({ args })),
}));

vi.mock("../lib/firebaseconfig", () => ({
  db: {},
  auth: mocks.auth,
}));

vi.mock("firebase/firestore", () => ({
  getDoc: mocks.getDoc,
  doc: mocks.doc,
}));

describe("securityService", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.auth.currentUser = { uid: "u1" };

    const { clearSecurityCache } = await import("./securityService");
    clearSecurityCache();
  });

  it("valida e sanitiza string obrigatória", async () => {
    const { validateRequiredString } = await import("./securityService");

    expect(validateRequiredString("  Maria  ", "Nome", 2, 20)).toBe("Maria");
    expect(() => validateRequiredString("", "Nome")).toThrow("Nome é obrigatório");
    expect(() => validateRequiredString("ab", "Nome", 3, 20)).toThrow("Nome é obrigatório");
    expect(() => validateRequiredString("x".repeat(21), "Nome", 1, 20)).toThrow(
      "Nome excede o limite permitido"
    );
  });

  it("valida e normaliza e-mail", async () => {
    const { validateEmail } = await import("./securityService");

    expect(validateEmail("ADMIN@EMPRESA.COM")).toBe("admin@empresa.com");
    expect(() => validateEmail("email-invalido")).toThrow("E-mail inválido");
  });

  it("valida role permitida", async () => {
    const { validateRole } = await import("./securityService");

    expect(validateRole("admin")).toBe("admin");
    expect(validateRole("gestor")).toBe("gestor");
    expect(() => validateRole("superadmin")).toThrow("Role inválida");
  });

  it("valida número positivo", async () => {
    const { validatePositiveNumber } = await import("./securityService");

    expect(validatePositiveNumber("10.5", "Valor")).toBe(10.5);
    expect(() => validatePositiveNumber(0, "Valor")).toThrow("Valor deve ser maior que zero");
    expect(() => validatePositiveNumber("abc", "Valor")).toThrow("Valor deve ser maior que zero");
  });

  it("bloqueia quando usuário não está autenticado", async () => {
    mocks.auth.currentUser = null;
    const { assertAuthenticated } = await import("./securityService");

    await expect(assertAuthenticated()).rejects.toThrow("Usuário não autenticado");
  });

  it("busca role no firestore e usa cache por usuário", async () => {
    mocks.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "admin" }),
    });

    const { getCurrentUserRole } = await import("./securityService");

    const role1 = await getCurrentUserRole();
    const role2 = await getCurrentUserRole();

    expect(role1).toBe("admin");
    expect(role2).toBe("admin");
    expect(mocks.getDoc).toHaveBeenCalledTimes(1);
  });

  it("invalida cache ao trocar de usuário", async () => {
    mocks.getDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ role: "gestor" }),
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ role: "colaborador" }),
      });

    const { getCurrentUserRole } = await import("./securityService");

    const role1 = await getCurrentUserRole();
    mocks.auth.currentUser = { uid: "u2" };
    const role2 = await getCurrentUserRole();

    expect(role1).toBe("gestor");
    expect(role2).toBe("colaborador");
    expect(mocks.getDoc).toHaveBeenCalledTimes(2);
  });

  it("falha quando perfil não existe ou role é inválida", async () => {
    mocks.getDoc.mockResolvedValueOnce({
      exists: () => false,
    });

    const { getCurrentUserRole } = await import("./securityService");
    await expect(getCurrentUserRole()).rejects.toThrow("Perfil de usuário não encontrado");

    mocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ role: "owner" }),
    });

    await expect(getCurrentUserRole()).rejects.toThrow("Role de usuário inválida");
  });

  it("assertRole permite autorizado e nega sem permissão", async () => {
    mocks.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "colaborador" }),
    });

    const { assertRole, clearSecurityCache } = await import("./securityService");

    await expect(assertRole(["colaborador"])).resolves.toEqual({ uid: "u1", role: "colaborador" });

    clearSecurityCache();
    await expect(assertRole(["admin"], "aprovar lançamento")).rejects.toThrow(
      "Você não tem permissão para aprovar lançamento"
    );
  });

  it("assertOwnerOrRole permite dono mesmo sem role privilegiada", async () => {
    mocks.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "colaborador" }),
    });

    const { assertOwnerOrRole } = await import("./securityService");

    await expect(assertOwnerOrRole("u1", ["admin"], "editar item")).resolves.toEqual({
      uid: "u1",
      role: "colaborador",
    });

    await expect(assertOwnerOrRole("u999", ["admin"], "editar item")).rejects.toThrow(
      "Você não tem permissão para editar item"
    );
  });

  it("retorna escopo com flag de privilégio", async () => {
    const { getDataScope, clearSecurityCache } = await import("./securityService");

    mocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ role: "admin" }),
    });
    await expect(getDataScope(["admin"])).resolves.toEqual({
      uid: "u1",
      role: "admin",
      isPrivileged: true,
    });

    clearSecurityCache();
    mocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ role: "colaborador" }),
    });
    await expect(getDataScope(["colaborador"])).resolves.toEqual({
      uid: "u1",
      role: "colaborador",
      isPrivileged: false,
    });
  });
});
