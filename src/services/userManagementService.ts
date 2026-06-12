import { db, functions } from "../lib/firebaseconfig";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  orderBy,
  where,
  Timestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import type { User, RegisterCredentials } from "../types/user";
import getFirebaseErrorMessage from "../components/ui/ErrorMessage";
import {
  assertRole,
  validateEmail,
  validateRequiredString,
  validateRole,
  type UserRole,
} from "./securityService";
import { isFirebaseConfigured } from "../utils/firebaseEnv";
import { createAuthUserViaRest } from "../utils/firebaseAuthRest";

interface FirebaseError {
  code?: string;
  message?: string;
}

const USERS_COLLECTION = "users";

function isValidPassword(password: string): boolean {
  return password.length >= 6 && /[A-Z]/.test(password);
}

function assertCreatableRole(requesterRole: UserRole, targetRole: UserRole): void {
  if (requesterRole === "gestor" && targetRole !== "colaborador") {
    throw new Error("Gestores só podem criar contas de colaborador.");
  }
  if (requesterRole === "admin" && targetRole === "admin") {
    throw new Error("Não é possível criar outro administrador por aqui.");
  }
  if (requesterRole === "colaborador") {
    throw new Error("Você não tem permissão para criar usuários.");
  }
}

export function getCreatableRoles(requesterRole?: UserRole): UserRole[] {
  if (requesterRole === "admin") return ["gestor", "colaborador"];
  if (requesterRole === "gestor") return ["colaborador"];
  return [];
}

async function createUserDoc(
  uid: string,
  name: string,
  email: string,
  role: UserRole
): Promise<void> {
  await setDoc(
    doc(db, USERS_COLLECTION, uid),
    {
      uid,
      name,
      email,
      role,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );
}

async function createViaCallable(
  email: string,
  password: string,
  name: string,
  role: UserRole
): Promise<User> {
  const createUserFn = httpsCallable<
    { email: string; password: string; name: string; role: string },
    { uid: string; name: string; email: string; role: User["role"] }
  >(functions, "createUserByAdmin");

  const result = await createUserFn({ email, password, name, role });
  const created = result.data;
  return {
    uid: created.uid,
    name: created.name,
    email: created.email,
    password: "",
    role: created.role,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

async function createViaRest(
  email: string,
  password: string,
  name: string,
  role: UserRole
): Promise<User> {
  const uid = await createAuthUserViaRest(email, password);
  await createUserDoc(uid, name, email, role);
  return {
    uid,
    name,
    email,
    password: "",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function mapUserDoc(userDoc: { id: string; data: () => Record<string, unknown> }): User {
  const data = userDoc.data();
  return {
    uid: userDoc.id,
    name: (data.name as string) || "",
    email: (data.email as string) || "",
    password: "",
    role: (data.role as User["role"]) || "colaborador",
    createdAt:
      (data.createdAt as { toDate?: () => Date })?.toDate?.() || new Date(),
    updatedAt:
      (data.updatedAt as { toDate?: () => Date })?.toDate?.() || new Date(),
  };
}

export const userManagementService = {
  async listAll(): Promise<User[]> {
    await assertRole(["admin"], "listar usuários");
    try {
      const q = query(
        collection(db, USERS_COLLECTION),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(mapUserDoc);
    } catch (error) {
      console.error("Erro ao listar usuários:", error);
      throw new Error("Não foi possível listar os usuários");
    }
  },

  async listTeam(): Promise<User[]> {
    const { role: requesterRole } = await assertRole(
      ["admin", "gestor"],
      "listar usuários da equipe"
    );
    try {
      const roles: UserRole[] =
        requesterRole === "admin" ? ["gestor", "colaborador"] : ["colaborador"];
      const q = query(collection(db, USERS_COLLECTION), where("role", "in", roles));
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map(mapUserDoc)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error("Erro ao listar usuários da equipe:", error);
      throw new Error("Não foi possível listar os usuários da equipe");
    }
  },

  async create(credentials: RegisterCredentials): Promise<User> {
    const { role: requesterRole } = await assertRole(
      ["admin", "gestor"],
      "criar usuários"
    );

    const name = validateRequiredString(credentials.name, "Nome", 2, 120);
    const email = validateEmail(credentials.email);
    const role = validateRole(credentials.role || "colaborador");
    assertCreatableRole(requesterRole, role);

    if (!credentials.password || !isValidPassword(credentials.password)) {
      throw new Error(
        "A senha deve ter no mínimo 6 caracteres e pelo menos 1 letra maiúscula."
      );
    }

    if (!isFirebaseConfigured()) {
      throw new Error("Firebase não configurado. Não é possível criar usuários.");
    }

    try {
      return await createViaCallable(email, credentials.password, name, role);
    } catch (error: unknown) {
      const firebaseError = error as FirebaseError;
      const code = firebaseError?.code ?? "";
      if (
        code === "functions/not-found" ||
        code.includes("not-found") ||
        firebaseError?.message?.includes("not-found")
      ) {
        try {
          return await createViaRest(email, credentials.password, name, role);
        } catch (restError: unknown) {
          const rest = restError as Error & { code?: string };
          if (rest.code === "EMAIL_EXISTS") {
            throw new Error("Este e-mail já possui uma conta no sistema.");
          }
          throw rest;
        }
      }
      const message = getFirebaseErrorMessage(error as string | FirebaseError);
      throw new Error(message);
    }
  },

  async update(
    uid: string,
    data: Partial<Pick<User, "name" | "email" | "role">>
  ): Promise<void> {
    const { role: requesterRole } = await assertRole(["admin"], "atualizar usuários");
    const payload: Partial<Pick<User, "name" | "email" | "role">> = {};
    if (data.name !== undefined) {
      payload.name = validateRequiredString(data.name, "Nome", 2, 120);
    }
    if (data.email !== undefined) {
      payload.email = validateEmail(data.email);
    }
    if (data.role !== undefined) {
      const nextRole = validateRole(data.role);
      assertCreatableRole(requesterRole, nextRole);
      if (nextRole === "admin") {
        throw new Error("Não é possível promover usuário a administrador por aqui.");
      }
      payload.role = nextRole;
    }

    try {
      const userDocRef = doc(db, USERS_COLLECTION, uid);
      await setDoc(
        userDocRef,
        {
          ...payload,
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      throw new Error("Não foi possível atualizar o usuário");
    }
  },

  async delete(uid: string): Promise<void> {
    await assertRole(["admin"], "deletar usuários");

    if (!isFirebaseConfigured()) {
      throw new Error("Firebase não configurado.");
    }

    try {
      const deleteUserFn = httpsCallable<{ uid: string }, { success: boolean }>(
        functions,
        "deleteUserByAdmin"
      );
      await deleteUserFn({ uid });
    } catch (error) {
      console.error("Erro ao deletar usuário:", error);
      throw new Error("Não foi possível deletar o usuário");
    }
  },
};
