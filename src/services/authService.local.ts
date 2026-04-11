// authService.local.ts
import type {
  LoginCredentials,
  RegisterCredentials,
  User,
} from "../types/user";

const USERS_KEY = "@app:users";
const SESSION_KEY = "@app:session";

/* 🔐 Regra única de senha */
function isValidPassword(password: string): boolean {
  return password.length >= 6 && /[A-Z]/.test(password);
}

function loadUsers(): User[] {
  const data = localStorage.getItem(USERS_KEY);
  if (!data) return [];

  const parsed = JSON.parse(data) as User[];
  return parsed.map((user) => ({
    ...user,
    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.updatedAt),
  }));
}

function saveUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function saveSession(user: User | null) {
  if (!user) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function loadSession(): User | null {
  const data = localStorage.getItem(SESSION_KEY);
  if (!data) return null;

  const user = JSON.parse(data) as User;
  return {
    ...user,
    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.updatedAt),
  };
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<User> {
    const users = loadUsers();

    const user = users.find((u) => u.email === credentials.email);
    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    if (user.password !== credentials.password) {
      throw new Error("Senha incorreta");
    }

    const updatedUser: User = {
      ...user,
      updatedAt: new Date(),
    };

    saveSession(updatedUser);
    return updatedUser;
  },

  async register(credentials: RegisterCredentials): Promise<User> {
    const users = loadUsers();

    if (credentials.password !== credentials.confirmPassword) {
      throw new Error("As senhas não conferem");
    }

    if (!isValidPassword(credentials.password)) {
      throw new Error(
        "A senha deve ter no mínimo 6 caracteres e pelo menos 1 letra maiúscula"
      );
    }

    const emailExists = users.some((u) => u.email === credentials.email);
    if (emailExists) {
      throw new Error("E-mail já cadastrado");
    }

    const newUser: User = {
      uid: crypto.randomUUID(),
      name: credentials.name,
      email: credentials.email,
      role: "colaborador",
      createdAt: new Date(),
      updatedAt: new Date(),
      password: credentials.password,
    };

    saveUsers([...users, newUser]);
    saveSession(newUser);

    return newUser;
  },

  async logOut(): Promise<void> {
    saveSession(null);
  },

  observeAuthState(callback: (user: User | null) => void) {
    const user = loadSession();
    callback(user);
    return () => {};
  },

  async updateProfile(data: {
    name?: string;
    profileImageUrl?: string | null;
  }): Promise<User> {
    const sessionUser = loadSession();
    if (!sessionUser) {
      throw new Error("Usuário não autenticado");
    }

    const updatedUser: User = {
      ...sessionUser,
      name: data.name?.trim() || sessionUser.name,
      profileImageUrl:
        data.profileImageUrl === undefined
          ? sessionUser.profileImageUrl ?? null
          : data.profileImageUrl,
      updatedAt: new Date(),
    };

    const users = loadUsers().map((u) =>
      u.uid === sessionUser.uid ? updatedUser : u
    );

    saveUsers(users);
    saveSession(updatedUser);
    return updatedUser;
  },

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const sessionUser = loadSession();
    if (!sessionUser) {
      throw new Error("Usuário não autenticado");
    }

    if (sessionUser.password !== currentPassword) {
      throw new Error("Senha atual incorreta");
    }

    if (!isValidPassword(newPassword)) {
      throw new Error(
        "A nova senha deve ter no mínimo 6 caracteres e pelo menos 1 letra maiúscula"
      );
    }

    const users = loadUsers();
    const updatedUsers = users.map((u) =>
      u.uid === sessionUser.uid
        ? { ...u, password: newPassword, updatedAt: new Date() }
        : u
    );

    saveUsers(updatedUsers);

    saveSession({
      ...sessionUser,
      password: newPassword,
      updatedAt: new Date(),
    });
  },

  async resetPassword(_email: string): Promise<void> {
    throw new Error(
      "Recuperação de senha por e-mail não está disponível no modo local. Use o Firebase para habilitar."
    );
  },
};
