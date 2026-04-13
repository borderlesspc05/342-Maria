import type { User } from "../types/user";

const USERS_KEY = "@app:users";
const SESSION_KEY = "@app:session";

function seedUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function readUsers(): User[] {
  const raw = localStorage.getItem(USERS_KEY);
  return raw ? (JSON.parse(raw) as User[]) : [];
}

describe("authService.local", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    localStorage.clear();

    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => "uuid-1"),
    });
  });

  it("registra usuário com role padrão e cria sessão", async () => {
    const { authService } = await import("./authService.local");

    const user = await authService.register({
      name: "Maria",
      email: "maria@empresa.com",
      password: "SenhaForte1",
      confirmPassword: "SenhaForte1",
    });

    expect(user.uid).toBe("uuid-1");
    expect(user.role).toBe("colaborador");
    expect(user.email).toBe("maria@empresa.com");

    const session = localStorage.getItem(SESSION_KEY);
    expect(session).toBeTruthy();

    const users = readUsers();
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe("maria@empresa.com");
  });

  it("bloqueia registro com confirmação diferente", async () => {
    const { authService } = await import("./authService.local");

    await expect(
      authService.register({
        name: "Maria",
        email: "maria@empresa.com",
        password: "SenhaForte1",
        confirmPassword: "SenhaForte2",
      })
    ).rejects.toThrow("As senhas não conferem");
  });

  it("bloqueia registro com senha fraca", async () => {
    const { authService } = await import("./authService.local");

    await expect(
      authService.register({
        name: "Maria",
        email: "maria@empresa.com",
        password: "abc123",
        confirmPassword: "abc123",
      })
    ).rejects.toThrow("A senha deve ter no mínimo 6 caracteres e pelo menos 1 letra maiúscula");
  });

  it("bloqueia registro com e-mail duplicado", async () => {
    seedUsers([
      {
        uid: "u1",
        name: "Maria",
        email: "maria@empresa.com",
        password: "SenhaForte1",
        role: "colaborador",
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      },
    ]);

    const { authService } = await import("./authService.local");

    await expect(
      authService.register({
        name: "Outra",
        email: "maria@empresa.com",
        password: "SenhaForte1",
        confirmPassword: "SenhaForte1",
      })
    ).rejects.toThrow("E-mail já cadastrado");
  });

  it("faz login e atualiza data de sessão", async () => {
    seedUsers([
      {
        uid: "u1",
        name: "Maria",
        email: "maria@empresa.com",
        password: "SenhaForte1",
        role: "colaborador",
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      },
    ]);

    const { authService } = await import("./authService.local");
    const user = await authService.login({
      email: "maria@empresa.com",
      password: "SenhaForte1",
    });

    expect(user.uid).toBe("u1");

    const session = localStorage.getItem(SESSION_KEY);
    expect(session).toBeTruthy();
  });

  it("bloqueia login com usuário inexistente ou senha incorreta", async () => {
    seedUsers([
      {
        uid: "u1",
        name: "Maria",
        email: "maria@empresa.com",
        password: "SenhaForte1",
        role: "colaborador",
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      },
    ]);

    const { authService } = await import("./authService.local");

    await expect(
      authService.login({ email: "naoexiste@empresa.com", password: "SenhaForte1" })
    ).rejects.toThrow("Usuário não encontrado");

    await expect(
      authService.login({ email: "maria@empresa.com", password: "senhaErrada" })
    ).rejects.toThrow("Senha incorreta");
  });

  it("observeAuthState retorna usuário da sessão e unsubscribe funcional", async () => {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        uid: "u1",
        name: "Maria",
        email: "maria@empresa.com",
        password: "SenhaForte1",
        role: "colaborador",
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      })
    );

    const { authService } = await import("./authService.local");
    const callback = vi.fn();

    const unsubscribe = authService.observeAuthState(callback);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ uid: "u1" }));
    expect(typeof unsubscribe).toBe("function");

    unsubscribe();
  });

  it("atualiza perfil com sanitização de nome e imagem", async () => {
    const baseUser = {
      uid: "u1",
      name: "Maria",
      email: "maria@empresa.com",
      password: "SenhaForte1",
      role: "colaborador" as const,
      profileImageUrl: "https://imagem-antiga.local",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    };

    seedUsers([baseUser]);
    localStorage.setItem(SESSION_KEY, JSON.stringify(baseUser));

    const { authService } = await import("./authService.local");
    const updated = await authService.updateProfile({
      name: "  Maria Souza  ",
      profileImageUrl: null,
    });

    expect(updated.name).toBe("Maria Souza");
    expect(updated.profileImageUrl).toBe(null);

    const users = readUsers();
    expect(users[0].name).toBe("Maria Souza");
    expect(users[0].profileImageUrl).toBe(null);
  });

  it("bloqueia updateProfile sem sessão", async () => {
    const { authService } = await import("./authService.local");

    await expect(authService.updateProfile({ name: "Teste" })).rejects.toThrow(
      "Usuário não autenticado"
    );
  });

  it("troca senha com validações de segurança", async () => {
    const baseUser = {
      uid: "u1",
      name: "Maria",
      email: "maria@empresa.com",
      password: "SenhaForte1",
      role: "colaborador" as const,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    };

    seedUsers([baseUser]);
    localStorage.setItem(SESSION_KEY, JSON.stringify(baseUser));

    const { authService } = await import("./authService.local");

    await expect(authService.changePassword("errada", "SenhaNova1")).rejects.toThrow(
      "Senha atual incorreta"
    );

    await expect(authService.changePassword("SenhaForte1", "fraca")).rejects.toThrow(
      "A nova senha deve ter no mínimo 6 caracteres e pelo menos 1 letra maiúscula"
    );

    await authService.changePassword("SenhaForte1", "SenhaNova1");

    const users = readUsers();
    expect(users[0].password).toBe("SenhaNova1");

    const session = localStorage.getItem(SESSION_KEY);
    expect(session).toContain("SenhaNova1");
  });

  it("faz logout removendo sessão", async () => {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ uid: "u1", email: "maria@empresa.com" })
    );

    const { authService } = await import("./authService.local");
    await authService.logOut();

    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("resetPassword informa limitação do modo local", async () => {
    const { authService } = await import("./authService.local");

    await expect(authService.resetPassword("maria@empresa.com")).rejects.toThrow(
      "Recuperação de senha por e-mail não está disponível no modo local"
    );
  });
});
