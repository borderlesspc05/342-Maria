import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ChangePasswordModal } from "./ChangePasswordModal";

const mockedChangePassword = vi.fn();

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    changePassword: mockedChangePassword,
  }),
}));

describe("ChangePasswordModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("executa alteracao de senha com sucesso e exibe feedback", async () => {
    mockedChangePassword.mockResolvedValue(undefined);
    const timeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const user = userEvent.setup();

    render(<ChangePasswordModal isOpen onClose={vi.fn()} />);

    await user.type(screen.getByPlaceholderText("Digite sua senha atual"), "SenhaAtual1");
    await user.type(screen.getByPlaceholderText("Digite a nova senha"), "NovaSenha1");
    await user.type(screen.getByPlaceholderText("Repita a nova senha"), "NovaSenha1");

    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => {
      expect(mockedChangePassword).toHaveBeenCalledWith("SenhaAtual1", "NovaSenha1");
    });

    expect(screen.getByText("Senha alterada com sucesso!")).toBeInTheDocument();
    expect(timeoutSpy).toHaveBeenCalled();
  });

  it("exibe erro retornado pelo contexto quando alteracao falha", async () => {
    mockedChangePassword.mockRejectedValue(new Error("Falha ao alterar senha"));

    const user = userEvent.setup();

    render(<ChangePasswordModal isOpen onClose={vi.fn()} />);

    await user.type(screen.getByPlaceholderText("Digite sua senha atual"), "SenhaAtual1");
    await user.type(screen.getByPlaceholderText("Digite a nova senha"), "NovaSenha1");
    await user.type(screen.getByPlaceholderText("Repita a nova senha"), "NovaSenha1");

    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Falha ao alterar senha")).toBeInTheDocument();
  });
});
