import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { paths } from "./paths";
import { ProtectedRoutes } from "./ProtectedRoutes";
import Login from "../pages/Login/Login";
import Register from "../pages/Register/Register";
import ForgotPassword from "../pages/ForgotPassword/ForgotPassword";
import SetupAdmin from "../pages/Setup/SetupAdmin";
import Dashboard from "../pages/Dashboard/Dashboard";
import Administracao from "../pages/Administracao/Administracao";
import Colaboradores from "../pages/Colaboradores/Colaboradores";
import PremiosProdutividade from "../pages/PremiosProdutividade/PremiosProdutividade";
import BoletinsMedicao from "../pages/BoletinsMedicao/BoletinsMedicao";
import Documentacoes from "../pages/Documentacoes/Documentacoes";
import CadernoVirtual from "../pages/CadernoVirtual/CadernoVirtual";
import Relatorios from "../pages/Relatorios/Relatorios";
import Financeiro from "../pages/Financeiro/Financeiro";
import Notificacoes from "../pages/Notificacoes/Notificacoes";
import DocumentosFinanceiros from "../pages/DocumentosFinanceiros/DocumentosFinanceiros";
import Perfil from "../pages/Perfil/Perfil";
import Configuracoes from "../pages/Configuracoes/Configuracoes";
import Backup from "../pages/Backup/Backup";
import NotFound from "../pages/NotFound/NotFound";

const allowSetup =
  import.meta.env.DEV || import.meta.env.VITE_ALLOW_SETUP === "true";

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {allowSetup ? (
          <Route path="/setup-admin" element={<SetupAdmin />} />
        ) : (
          <Route
            path="/setup-admin"
            element={<Navigate to={paths.login} replace />}
          />
        )}
        <Route path={paths.login} element={<Login />} />
        <Route
          path={paths.register}
          element={
            <ProtectedRoutes allowedRoles={["admin"]}>
              <Register />
            </ProtectedRoutes>
          }
        />
        <Route path={paths.forgotPassword} element={<ForgotPassword />} />
        <Route
          path={paths.home}
          element={<Navigate to={paths.login} replace />}
        />
        <Route
          path={paths.lancamentosDiarios}
          element={<Navigate to={paths.cadernoVirtual} replace />}
        />
        <Route
          path={paths.configuracoesLegacy}
          element={<Navigate to={paths.configuracoes} replace />}
        />
        <Route
          path={paths.dashboard}
          element={
            <ProtectedRoutes allowedRoles={["admin", "gestor", "colaborador"]}>
              <Dashboard />
            </ProtectedRoutes>
          }
        />
        <Route
          path={paths.administracao}
          element={
            <ProtectedRoutes allowedRoles={["admin"]}>
              <Administracao />
            </ProtectedRoutes>
          }
        />
        <Route
          path={paths.colaboradores}
          element={
            <ProtectedRoutes allowedRoles={["admin", "gestor"]}>
              <Colaboradores />
            </ProtectedRoutes>
          }
        />
        <Route
          path={paths.premiosProdutividade}
          element={
            <ProtectedRoutes allowedRoles={["admin", "gestor"]}>
              <PremiosProdutividade />
            </ProtectedRoutes>
          }
        />
        <Route
          path={paths.boletinsMedicao}
          element={
            <ProtectedRoutes allowedRoles={["admin", "gestor"]}>
              <BoletinsMedicao />
            </ProtectedRoutes>
          }
        />
        <Route
          path={paths.documentacoes}
          element={
            <ProtectedRoutes allowedRoles={["admin", "gestor"]}>
              <Documentacoes />
            </ProtectedRoutes>
          }
        />
        <Route
          path={paths.cadernoVirtual}
          element={
            <ProtectedRoutes allowedRoles={["admin", "gestor", "colaborador"]}>
              <CadernoVirtual />
            </ProtectedRoutes>
          }
        />
        <Route
          path={paths.relatorios}
          element={
            <ProtectedRoutes allowedRoles={["admin", "gestor"]}>
              <Relatorios />
            </ProtectedRoutes>
          }
        />
        <Route
          path={paths.financeiro}
          element={
            <ProtectedRoutes allowedRoles={["admin"]}>
              <Financeiro />
            </ProtectedRoutes>
          }
        />
        <Route
          path={paths.notificacoes}
          element={
            <ProtectedRoutes allowedRoles={["admin", "gestor", "colaborador"]}>
              <Notificacoes />
            </ProtectedRoutes>
          }
        />
        <Route
          path={paths.perfil}
          element={
            <ProtectedRoutes allowedRoles={["admin", "gestor", "colaborador"]}>
              <Perfil />
            </ProtectedRoutes>
          }
        />
        <Route
          path={paths.configuracoes}
          element={
            <ProtectedRoutes allowedRoles={["admin"]}>
              <Configuracoes />
            </ProtectedRoutes>
          }
        />
        <Route
          path={paths.documentosFinanceiros}
          element={
            <ProtectedRoutes allowedRoles={["admin", "gestor"]}>
              <DocumentosFinanceiros />
            </ProtectedRoutes>
          }
        />
        <Route
          path={paths.backup}
          element={
            <ProtectedRoutes allowedRoles={["admin"]}>
              <Backup />
            </ProtectedRoutes>
          }
        />
        <Route
          path="*"
          element={
            <ProtectedRoutes allowedRoles={["admin", "gestor", "colaborador"]}>
              <NotFound />
            </ProtectedRoutes>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
