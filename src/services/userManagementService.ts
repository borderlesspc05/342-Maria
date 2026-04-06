import { db } from "../lib/firebaseconfig";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebaseconfig";
import type { User, RegisterCredentials } from "../types/user";
import getFirebaseErrorMessage from "../components/ui/ErrorMessage";
import {
  assertRole,
  validateEmail,
  validateRequiredString,
  validateRole,
} from "./securityService";

interface FirebaseError {
  code?: string;
  message?: string;
}

const USERS_COLLECTION = "users";

export const userManagementService = {
  /**
   * Lista todos os usuários do sistema
   */
  async listAll(): Promise<User[]> {
    await assertRole(["admin"], "listar usuários");
    try {
      const q = query(
        collection(db, USERS_COLLECTION),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          uid: doc.id,
          name: data.name || "",
          email: data.email || "",
          password: "", // Nunca retornamos senhas
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

  /**
   * Cria um novo usuário no Firebase Auth e Firestore
   */
  async create(credentials: RegisterCredentials): Promise<User> {
    await assertRole(["admin"], "criar usuários");
    const name = validateRequiredString(credentials.name, "Nome", 2, 120);
    const email = validateEmail(credentials.email);
    const role = validateRole(credentials.role || "colaborador");

    try {
      // Cria no Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        credentials.password
      );

      const firebaseUser = userCredential.user;

      // Cria o documento no Firestore
      const newUser: User = {
        uid: firebaseUser.uid,
        name,
        email,
        password: "", // Não armazenamos senha no Firestore
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(doc(db, USERS_COLLECTION, firebaseUser.uid), {
        ...newUser,
        createdAt: Timestamp.fromDate(newUser.createdAt),
        updatedAt: Timestamp.fromDate(newUser.updatedAt),
      });

      return newUser;
    } catch (error: any) {
      const message = getFirebaseErrorMessage(error as string | FirebaseError);
      throw new Error(message);
    }
  },

  /**
   * Atualiza um usuário existente (apenas dados do Firestore, não senha)
   */
  async update(uid: string, data: Partial<Pick<User, "name" | "email" | "role">>): Promise<void> {
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

  /**
   * Deleta um usuário (do Auth e Firestore)
   */
  async delete(uid: string): Promise<void> {
    await assertRole(["admin"], "deletar usuários");
    try {
      // Deleta do Firestore primeiro
      await deleteDoc(doc(db, USERS_COLLECTION, uid));

      // Nota: Para deletar do Firebase Auth, precisaríamos estar logados como esse usuário
      // ou usar Admin SDK. Por enquanto, apenas deletamos do Firestore.
      // O usuário ainda poderá fazer login, mas não terá acesso ao sistema.
      console.warn(
        "Usuário removido do Firestore. Para remover completamente, use o Firebase Console."
      );
    } catch (error) {
      console.error("Erro ao deletar usuário:", error);
      throw new Error("Não foi possível deletar o usuário");
    }
  },
};
