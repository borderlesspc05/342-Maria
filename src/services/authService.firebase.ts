import { auth, db } from "../lib/firebaseconfig";
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateProfile as updateFirebaseProfile,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  type Unsubscribe,
  onAuthStateChanged,
  updatePassword,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import type {
  LoginCredentials,
  RegisterCredentials,
  User,
} from "../types/user";
import getFirebaseErrorMessage from "../components/ui/ErrorMessage";

interface FirebaseError {
  code?: string;
  message?: string;
}

function isValidPassword(password: string): boolean {
  return password.length >= 6 && /[A-Z]/.test(password);
}

const firebaseAuthService = {
  async logOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      const message = getFirebaseErrorMessage(error as string | FirebaseError);
      throw new Error(message);
    }
  },

  async login(credentials: LoginCredentials): Promise<User> {
    try {
      const userCredentials = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );

      const firebaseUser = userCredentials.user;
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      // Se o documento não existe, cria automaticamente com dados básicos
      if (!userDoc.exists()) {
        const newUserData: User = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Usuário",
          email: firebaseUser.email || credentials.email,
          password: "", // Não armazenamos senha no Firestore
          role: "colaborador", // Role padrão
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await setDoc(userDocRef, {
          ...newUserData,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        return newUserData;
      }

      const userData = userDoc.data() as User;

      // Atualiza apenas o updatedAt
      await setDoc(
        userDocRef,
        {
          updatedAt: new Date(),
        },
        { merge: true }
      );

      return userData;
    } catch (error) {
      const message = getFirebaseErrorMessage(error as string | FirebaseError);
      throw new Error(message);
    }
  },

  async register(credentials: RegisterCredentials): Promise<User> {
    if (!isValidPassword(credentials.password)) {
      throw new Error("A senha deve ter no mínimo 6 caracteres e pelo menos 1 letra maiúscula");
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );

      const firebaseUser = userCredential.user;

      const newUser: User = {
        uid: firebaseUser.uid,
        name: credentials.name,
        email: credentials.email,
        password: "", // Não armazenamos senha no Firestore
        role: "colaborador",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(doc(db, "users", firebaseUser.uid), {
        ...newUser,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return newUser;
    } catch (error) {
      const message = getFirebaseErrorMessage(error as string | FirebaseError);
      throw new Error(message);
    }
  },

  observeAuthState(callback: (user: User | null) => void): Unsubscribe {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        callback(null);
        return;
      }

      try {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        // Se o documento não existe, cria automaticamente
        if (!userDoc.exists()) {
          const newUserData: User = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Usuário",
            email: firebaseUser.email || "",
            password: "",
            role: "colaborador",
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          await setDoc(userDocRef, {
            ...newUserData,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          callback(newUserData);
          return;
        }

        callback(userDoc.data() as User);
      } catch (error) {
        console.error("Erro ao buscar usuário no Firestore:", error);
        callback(null);
      }
    });
  },

  async updateProfile(data: {
    name?: string;
    profileImageUrl?: string | null;
  }): Promise<User> {
    const firebaseUser = auth.currentUser;

    if (!firebaseUser) {
      throw new Error("Usuário não autenticado.");
    }

    try {
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      const currentData = (userDoc.exists() ? (userDoc.data() as User) : null) ?? {
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Usuário",
        email: firebaseUser.email || "",
        password: "",
        role: "colaborador" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedUser: User = {
        ...currentData,
        name: data.name?.trim() || currentData.name,
        profileImageUrl:
          data.profileImageUrl === undefined
            ? currentData.profileImageUrl ?? null
            : data.profileImageUrl,
        updatedAt: new Date(),
      };

      await setDoc(
        userDocRef,
        {
          ...updatedUser,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      await updateFirebaseProfile(firebaseUser, {
        displayName: updatedUser.name,
        photoURL: updatedUser.profileImageUrl ?? null,
      });

      return updatedUser;
    } catch (error) {
      const message = getFirebaseErrorMessage(error as string | FirebaseError);
      throw new Error(message);
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const firebaseUser = auth.currentUser;

    if (!firebaseUser || !firebaseUser.email) {
      throw new Error("Usuário não autenticado.");
    }

    try {
      const credential = EmailAuthProvider.credential(
        firebaseUser.email,
        currentPassword
      );

      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, newPassword);

      await setDoc(
        doc(db, "users", firebaseUser.uid),
        { updatedAt: new Date() },
        { merge: true }
      );
    } catch (error) {
      const message = getFirebaseErrorMessage(error as string | FirebaseError);
      throw new Error(message);
    }
  },

  async resetPassword(email: string): Promise<void> {
    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed) {
      throw new Error("Informe o e-mail.");
    }

    try {
      const appUrl =
        (import.meta.env.VITE_APP_URL as string)?.trim() ||
        "https://maria-44e49.web.app";
      const continueUrl = `${appUrl.replace(/\/$/, "")}/login`;

      await sendPasswordResetEmail(auth, emailTrimmed, {
        url: continueUrl,
        handleCodeInApp: false,
      });
    } catch (error) {
      const message = getFirebaseErrorMessage(error as string | FirebaseError);
      throw new Error(message);
    }
  },
};

/**
 * 🔑 EXPORT PADRÃO ESPERADO PELO APP
 */
export const authService = firebaseAuthService;
