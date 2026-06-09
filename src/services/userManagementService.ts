import { db, functions } from "../lib/firebaseconfig";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  orderBy,
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
} from "./securityService";
import { isFirebaseConfigured } from "../utils/firebaseEnv";

interface FirebaseError {
  code?: string;
  message?: string;
}

const USERS_COLLECTION = "users";

export const userManagementService = {
  async listAll(): Promise<User[]> {
    await assertRole(["admin"], "listar usuários");
    try {
      const q = query(
        collection(db, USERS_COLLECTION),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((userDoc) => {
        const data = userDoc.data();
        return {
          uid: userDoc.id,
          name: data.name || "",
          email: data.email || "",
          password: "",
          role: data.role || "colaborador",
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as User;
      });
    } catch (error) {
      console.error("Erro ao listar usuários:", error);
      throw new Error("Não foi possível listar os usuários");
    }
  },

  async create(credentials: RegisterCredentials): Promise<User> {
    await assertRole(["admin"], "criar usuários");
    const name = validateRequiredString(credentials.name, "Nome", 2, 120);
    const email = validateEmail(credentials.email);
    const role = validateRole(credentials.role || "colaborador");

    if (!isFirebaseConfigured()) {
      throw new Error("Firebase não configurado. Não é possível criar usuários.");
    }

    try {
      const createUserFn = httpsCallable<
        { email: string; password: string; name: string; role: string },
        { uid: string; name: string; email: string; role: User["role"] }
      >(functions, "createUserByAdmin");

      const result = await createUserFn({
        email,
        password: credentials.password,
        name,
        role,
      });

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
    } catch (error: unknown) {
      const message = getFirebaseErrorMessage(error as string | FirebaseError);
      throw new Error(message);
    }
  },

  async update(
    uid: string,
    data: Partial<Pick<User, "name" | "email" | "role">>
  ): Promise<void> {
    await assertRole(["admin"], "atualizar usuários");
    const payload: Partial<Pick<User, "name" | "email" | "role">> = {};
    if (data.name !== undefined) {
      payload.name = validateRequiredString(data.name, "Nome", 2, 120);
    }
    if (data.email !== undefined) {
      payload.email = validateEmail(data.email);
    }
    if (data.role !== undefined) {
      payload.role = validateRole(data.role);
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
