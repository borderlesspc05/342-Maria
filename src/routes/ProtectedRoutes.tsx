import { useAuth } from "../hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";
import { paths } from "./paths";
import type { ReactNode } from "react";
import { AppLoading } from "../components/ui/AppLoading";
import Forbidden from "../pages/Forbidden/Forbidden";

interface ProtectedRoutesProps {
  children: ReactNode;
  /** Papéis permitidos para acessar a rota. Se não informado, qualquer usuário autenticado pode acessar. */
  allowedRoles?: Array<"admin" | "gestor" | "colaborador">;
}

export function ProtectedRoutes({ children, allowedRoles }: ProtectedRoutesProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AppLoading label="Verificando sua sessão..." />;
  }

  if (!user) {
    return <Navigate to={paths.login} replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!user.role || !allowedRoles.includes(user.role)) {
      return <Forbidden />;
    }
  }

  return <>{children}</>;
}
