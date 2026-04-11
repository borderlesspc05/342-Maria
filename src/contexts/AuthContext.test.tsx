import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";
import type { User } from "../types/user";

const mockedAuthService = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  logOut: vi.fn(),
  observeAuthState: vi.fn(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
}));

const mockedGetFirebaseErrorMessage = vi.hoisted(() => vi.fn());

vi.mock("../services/authService.ts", () => ({
  authService: mockedAuthService,
}));

vi.mock("../components/ui/ErrorMessage", () => ({
  default: mockedGetFirebaseErrorMessage,
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

const createUser = (role: User["role"] = "colaborador"): User => ({
  uid: "user-1",
  name: "Maria",
  email: "maria@email.com",
  password: "",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  role,
});

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuthService.observeAuthState.mockImplementation((callback) => {
      callback(null);
      return vi.fn();
    });
    mockedAuthService.updateProfile = vi.fn();
    mockedAuthService.changePassword = vi.fn();
    mockedGetFirebaseErrorMessage.mockReturnValue("Erro mapeado");
  });

  it("faz login com sucesso e atualiza user", async () => {
    const user = createUser("admin");
    mockedAuthService.login.mockResolvedValue(user);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ email: user.email, password: "123456" });
    });

    expect(mockedAuthService.login).toHaveBeenCalledWith({
      email: user.email,
      password: "123456",
    });

    await waitFor(() => {
      expect(result.current.user?.uid).toBe("user-1");
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });

  it("retorna erro mapeado quando login falha", async () => {
    mockedAuthService.login.mockRejectedValue({ code: "auth/wrong-password" });
    mockedGetFirebaseErrorMessage.mockReturnValue("Senha incorreta");

    const { result } = renderHook(() => useAuth(), { wrapper });

    let thrownMessage = "";

    await act(async () => {
      try {
        await result.current.login({ email: "a@a.com", password: "errada" });
      } catch (error) {
        thrownMessage = (error as Error).message;
      }
    });

    expect(thrownMessage).toBe("Senha incorreta");

    await waitFor(() => {
      expect(result.current.user).toBeNull();
      expect(result.current.error).toBe("Senha incorreta");
      expect(result.current.loading).toBe(false);
    });
  });

  it("faz logout com sucesso e limpa user", async () => {
    const user = createUser();
    mockedAuthService.observeAuthState.mockImplementation((callback) => {
      callback(user);
      return vi.fn();
    });
    mockedAuthService.logOut.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.user?.uid).toBe("user-1");
    });

    await act(async () => {
      await result.current.logOut();
    });

    expect(mockedAuthService.logOut).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(result.current.user).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });

  it("retorna erro mapeado quando logout falha", async () => {
    mockedAuthService.logOut.mockRejectedValue(new Error("falha"));
    mockedGetFirebaseErrorMessage.mockReturnValue("Falha ao sair");

    const { result } = renderHook(() => useAuth(), { wrapper });

    let thrownMessage = "";

    await act(async () => {
      try {
        await result.current.logOut();
      } catch (error) {
        thrownMessage = (error as Error).message;
      }
    });

    expect(thrownMessage).toBe("Falha ao sair");

    await waitFor(() => {
      expect(result.current.error).toBe("Falha ao sair");
      expect(result.current.loading).toBe(false);
    });
  });

  it("altera senha com sucesso quando usuario autenticado", async () => {
    const user = createUser();
    mockedAuthService.observeAuthState.mockImplementation((callback) => {
      callback(user);
      return vi.fn();
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.user?.uid).toBe("user-1");
    });

    const beforeUpdate = result.current.user?.updatedAt;

    await act(async () => {
      await result.current.changePassword("atual123", "nova123");
    });

    expect(mockedAuthService.changePassword).toHaveBeenCalledWith(
      "atual123",
      "nova123"
    );

    await waitFor(() => {
      expect(result.current.user?.updatedAt).not.toEqual(beforeUpdate);
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });

  it("falha ao alterar senha quando servico nao implementa changePassword", async () => {
    (mockedAuthService as { changePassword?: unknown }).changePassword =
      undefined;

    const { result } = renderHook(() => useAuth(), { wrapper });

    await expect(
      act(async () => {
        await result.current.changePassword("atual", "nova");
      })
    ).rejects.toThrow("Alterar senha não disponível nesse serviço.");
  });

  it("falha ao alterar senha quando nao ha usuario autenticado", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await expect(
      act(async () => {
        await result.current.changePassword("atual", "nova");
      })
    ).rejects.toThrow("Usuário não autenticado.");
  });

  it("retorna erro mapeado quando changePassword falha", async () => {
    const user = createUser();
    mockedAuthService.observeAuthState.mockImplementation((callback) => {
      callback(user);
      return vi.fn();
    });
    mockedAuthService.changePassword.mockRejectedValue(new Error("falha"));
    mockedGetFirebaseErrorMessage.mockReturnValue("Falha ao alterar senha");

    const { result } = renderHook(() => useAuth(), { wrapper });

    let thrownMessage = "";

    await act(async () => {
      try {
        await result.current.changePassword("atual", "nova");
      } catch (error) {
        thrownMessage = (error as Error).message;
      }
    });

    expect(thrownMessage).toBe("Falha ao alterar senha");

    await waitFor(() => {
      expect(result.current.error).toBe("Falha ao alterar senha");
      expect(result.current.loading).toBe(false);
    });
  });

  it("atualiza nome e imagem do perfil", async () => {
    const user = createUser("admin");
    mockedAuthService.observeAuthState.mockImplementation((callback) => {
      callback(user);
      return vi.fn();
    });
    const updatedUser: User = {
      ...user,
      name: "Maria Atualizada",
      profileImageUrl: "data:image/png;base64,perfil",
      updatedAt: new Date("2026-04-10T12:10:00.000Z"),
    };
    mockedAuthService.updateProfile.mockResolvedValue(updatedUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.user?.uid).toBe("user-1");
    });

    await act(async () => {
      await result.current.updateProfile({
        name: "Maria Atualizada",
        profileImageUrl: "data:image/png;base64,perfil",
      });
    });

    expect(mockedAuthService.updateProfile).toHaveBeenCalledWith({
      name: "Maria Atualizada",
      profileImageUrl: "data:image/png;base64,perfil",
    });

    await waitFor(() => {
      expect(result.current.user?.name).toBe("Maria Atualizada");
      expect(result.current.user?.profileImageUrl).toBe(
        "data:image/png;base64,perfil"
      );
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });
});
