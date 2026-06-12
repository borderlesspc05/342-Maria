import { useAuth } from "./useAuth";
import { canAccessRoute } from "../routes/routePermissions";

/**
 * Hook para verificar permissões do usuário atual
 */
export function usePermissions() {
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";
  const isGestor = user?.role === "gestor";
  const isColaborador = user?.role === "colaborador";

  /**
   * Verifica se o usuário pode editar dados
   * Admin e Gestor podem editar, Colaborador apenas visualiza
   */
  const canEdit = isAdmin || isGestor;

  /**
   * Verifica se o usuário tem acesso à área de administração
   * Apenas Admin tem acesso
   */
  const canAccessAdmin = isAdmin;

  const canAccess = (path: string) => canAccessRoute(user?.role, path);

  return {
    isAdmin,
    isGestor,
    isColaborador,
    canEdit,
    canAccessAdmin,
    canAccess,
    userRole: user?.role,
  };
}
