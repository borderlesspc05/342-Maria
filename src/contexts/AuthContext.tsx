import { createContext, useContext, useEffect, useState } from "react";
import { authService} from "../services/authService.ts";
import type {
  User,
  LoginCredentials,
  RegisterCredentials,
} from "../types/user";
import type { ReactNode } from "react";
import type { FirebaseError } from "firebase/app";
import getFirebaseErrorMessage from "../components/ui/ErrorMessage";
import { clearSecurityCache } from "../services/securityService";

// Interface do contexto
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logOut: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  clearError: () => void;
}

// Criação do contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Observa autenticação
  useEffect(() => {
    const unsubscribe = authService.observeAuthState((user) => {
      clearSecurityCache();
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Login
  const login = async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      setError(null);
      clearSecurityCache();
      const user = await authService.login(credentials);
      setUser(user);
    } catch (err) {
      const message = getFirebaseErrorMessage(err as string | FirebaseError);
      setError(message);
      setUser(null);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  // Register
  const register = async (credentials: RegisterCredentials) => {
    try {
      setLoading(true);
      setError(null);
      await authService.register(credentials);
      setUser(null);
    } catch (err) {
      const message = getFirebaseErrorMessage(err as string | FirebaseError | string);
      setError(message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logOut = async () => {
    try {
      setLoading(true);
      setError(null);
      await authService.logOut();
      clearSecurityCache();
      setUser(null);
    } catch (err) {
      const message = getFirebaseErrorMessage(err as string | FirebaseError | string);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  // Alterar senha
  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!authService.changePassword) {
      throw new Error("Alterar senha não disponível nesse serviço.");
    }

    if (!user) {
      throw new Error("Usuário não autenticado.");
    }

    try {
      setLoading(true);
      setError(null);

      await authService.changePassword(currentPassword, newPassword);

      // Atualiza user local (mock)
      setUser({ ...user, updatedAt: new Date() } as User);

    } catch (err) {
      const message = getFirebaseErrorMessage(err as string | FirebaseError | string);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    register,
    logOut,
    changePassword,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ✅ Hook helper para usar contexto
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return context;
}

export { AuthContext };
