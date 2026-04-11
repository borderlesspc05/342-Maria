export interface User {
  uid: string;
  name: string;
  email: string;
  password: string;
  profileImageUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** Papel do usuário no sistema */
  role: "admin" | "gestor" | "colaborador";
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  name: string;
  /** Papel desejado para o novo usuário (definido pelo admin) */
  role?: "admin" | "gestor" | "colaborador";
  confirmPassword: string;
}
