import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import { ProtectedRoutes } from "./ProtectedRoutes";

const mockedUseAuth = vi.hoisted(() => vi.fn());

vi.mock("../hooks/useAuth", () => ({
  useAuth: mockedUseAuth,
}));

describe("ProtectedRoutes", () => {
  const renderRoute = (allowedRoles?: Array<"admin" | "gestor" | "colaborador">) =>
    render(
      <MemoryRouter initialEntries={["/private"]}>
        <Routes>
          <Route
            path="/private"
            element={
              <ProtectedRoutes allowedRoles={allowedRoles}>
                <div>Painel Privado</div>
              </ProtectedRoutes>
            }
          />
          <Route path="/login" element={<div>Tela Login</div>} />
          <Route path="/dashboard" element={<div>Tela Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );

  it("exibe loading enquanto autentica", () => {
    mockedUseAuth.mockReturnValue({ user: null, loading: true });

    renderRoute();

    expect(screen.getByText("Verificando sua sessão...")).toBeInTheDocument();
  });

  it("redireciona para login quando nao autenticado", () => {
    mockedUseAuth.mockReturnValue({ user: null, loading: false });

    renderRoute();

    expect(screen.getByText("Tela Login")).toBeInTheDocument();
  });

  it("exibe pagina de acesso restrito quando role nao permitida", () => {
    mockedUseAuth.mockReturnValue({
      user: { uid: "1", name: "Teste", email: "x@y.com", password: "", createdAt: new Date(), updatedAt: new Date(), role: "colaborador" },
      loading: false,
    });

    renderRoute(["admin"]);

    expect(screen.getByText("Acesso restrito")).toBeInTheDocument();
  });

  it("renderiza conteudo protegido quando role permitida", () => {
    mockedUseAuth.mockReturnValue({
      user: { uid: "1", name: "Admin", email: "admin@y.com", password: "", createdAt: new Date(), updatedAt: new Date(), role: "admin" },
      loading: false,
    });

    renderRoute(["admin", "gestor"]);

    expect(screen.getByText("Painel Privado")).toBeInTheDocument();
  });

  it("permite acesso quando rota aceita apenas gestor", () => {
    mockedUseAuth.mockReturnValue({
      user: { uid: "2", name: "Gestor", email: "gestor@y.com", password: "", createdAt: new Date(), updatedAt: new Date(), role: "gestor" },
      loading: false,
    });

    renderRoute(["gestor"]);

    expect(screen.getByText("Painel Privado")).toBeInTheDocument();
  });
});
