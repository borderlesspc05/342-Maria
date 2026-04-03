import { renderHook } from "@testing-library/react";
import { vi } from "vitest";
import { usePermissions } from "./usePermissions";

const mockedUseAuth = vi.hoisted(() => vi.fn());

vi.mock("./useAuth", () => ({
  useAuth: mockedUseAuth,
}));

describe("usePermissions", () => {
  it("retorna permissoes de admin", () => {
    mockedUseAuth.mockReturnValue({ user: { role: "admin" } });

    const { result } = renderHook(() => usePermissions());

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.canEdit).toBe(true);
    expect(result.current.canAccessAdmin).toBe(true);
  });

  it("retorna permissoes de colaborador", () => {
    mockedUseAuth.mockReturnValue({ user: { role: "colaborador" } });

    const { result } = renderHook(() => usePermissions());

    expect(result.current.isColaborador).toBe(true);
    expect(result.current.canEdit).toBe(false);
    expect(result.current.canAccessAdmin).toBe(false);
  });
});
