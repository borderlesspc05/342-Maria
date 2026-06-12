import type { UserRole } from "../services/securityService";
import { paths } from "./paths";

/** Papéis permitidos por rota (espelha AppRoutes). */
export const ROUTE_ACCESS: Record<string, UserRole[]> = {
  [paths.dashboard]: ["admin", "gestor", "colaborador"],
  [paths.notificacoes]: ["admin", "gestor", "colaborador"],
  [paths.cadernoVirtual]: ["admin", "gestor", "colaborador"],
  [paths.perfil]: ["admin", "gestor", "colaborador"],
  [paths.administracao]: ["admin"],
  [paths.colaboradores]: ["admin", "gestor"],
  [paths.premiosProdutividade]: ["admin", "gestor"],
  [paths.boletinsMedicao]: ["admin", "gestor"],
  [paths.documentacoes]: ["admin", "gestor"],
  [paths.relatorios]: ["admin", "gestor"],
  [paths.financeiro]: ["admin"],
  [paths.documentosFinanceiros]: ["admin", "gestor"],
  [paths.configuracoes]: ["admin"],
  [paths.configuracoesLegacy]: ["admin"],
  [paths.backup]: ["admin"],
  [paths.register]: ["admin"],
};

export function normalizeRoutePath(path: string): string {
  const base = path.split("?")[0].split("#")[0];
  if (!base || base === "/") return paths.dashboard;
  return base.endsWith("/") && base.length > 1 ? base.slice(0, -1) : base;
}

export function canAccessRoute(
  role: UserRole | undefined,
  path: string
): boolean {
  if (!role) return false;
  const normalized = normalizeRoutePath(path);
  const allowed = ROUTE_ACCESS[normalized];
  if (!allowed) return false;
  return allowed.includes(role);
}
