/**
 * Script utilitário para criar o usuário admin inicial
 * Execute este script uma vez para criar o usuário admin no Firebase
 * 
 * Como usar:
 * 1. Importe e execute: createAdminUser()
 * 2. Ou execute no console do navegador após fazer login como outro usuário admin
 */

import { auth, db } from "../lib/firebaseconfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import type { User } from "../types/user";

export async function createAdminUser(): Promise<void> {
  const adminEmail = "admin@gmail.com";
  const adminPassword = "123456";
  const adminName = "Administrador";

  try {
    console.log("🔐 Criando usuário admin...");

    // Cria o usuário no Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      adminEmail,
      adminPassword
    );

    const firebaseUser = userCredential.user;
    console.log("✅ Usuário criado no Firebase Auth:", firebaseUser.uid);

    // Verifica se já existe documento no Firestore
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const existingDoc = await getDoc(userDocRef);

    if (existingDoc.exists()) {
      console.log("⚠️ Usuário já existe no Firestore. Atualizando role para admin...");
      await setDoc(
        userDocRef,
        {
          role: "admin",
          updatedAt: new Date(),
        },
        { merge: true }
      );
      console.log("✅ Role atualizado para admin!");
      return;
    }

    // Cria o documento no Firestore com role admin
    const adminUser: User = {
      uid: firebaseUser.uid,
      name: adminName,
      email: adminEmail,
      password: "", // Não armazenamos senha no Firestore
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(userDocRef, {
      ...adminUser,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("✅ Usuário admin criado com sucesso!");
    console.log("📧 Email:", adminEmail);
    console.log("👤 Role: admin");
  } catch (error: any) {
    if (error.code === "auth/email-already-in-use") {
      console.log("⚠️ Email já está em uso. Tentando fazer login e atualizar...");
      
      // Se o usuário já existe no Auth, tenta fazer login e atualizar o Firestore
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      try {
        // Primeiro faz logout se houver alguém logado
        if (auth.currentUser) {
          const { signOut } = await import("firebase/auth");
          await signOut(auth);
        }

        // Tenta fazer login com as credenciais
        const loginCredential = await signInWithEmailAndPassword(
          auth,
          adminEmail,
          adminPassword
        );
        
        const userDocRef = doc(db, "users", loginCredential.user.uid);
        await setDoc(
          userDocRef,
          {
            name: adminName,
            email: adminEmail,
            role: "admin",
            updatedAt: new Date(),
          },
          { merge: true }
        );
        
        console.log("✅ Usuário existente atualizado para admin!");
        
        // Faz logout novamente para não deixar logado
        const { signOut } = await import("firebase/auth");
        await signOut(auth);
      } catch (loginError: any) {
        if (loginError.code === "auth/wrong-password") {
          throw new Error(
            "Usuário já existe no Firebase Auth mas com senha diferente. " +
            "Altere a senha no Firebase Console ou delete o usuário e tente novamente."
          );
        }
        
        // Se for erro de permissões do Firestore
        if (loginError.code === "permission-denied" || loginError.message?.includes("permission")) {
          throw new Error(
            "❌ Erro de permissões do Firestore!\n\n" +
            "Configure as regras de segurança:\n" +
            "1. Acesse: https://console.firebase.google.com/project/maria-44e49/firestore/rules\n" +
            "2. Substitua as regras por:\n\n" +
            "rules_version = '2';\n" +
            "service cloud.firestore {\n" +
            "  match /databases/{database}/documents {\n" +
            "    match /users/{userId} {\n" +
            "      allow read, write: if request.auth != null;\n" +
            "    }\n" +
            "    match /{document=**} {\n" +
            "      allow read, write: if request.auth != null;\n" +
            "    }\n" +
            "  }\n" +
            "}\n\n" +
            "3. Clique em 'Publish'\n" +
            "4. Tente novamente aqui!"
          );
        }
        
        throw new Error(
          "Usuário já existe mas não foi possível atualizar: " + 
          (loginError.message || "Erro desconhecido")
        );
      }
    } else if (error.code === "permission-denied" || error.message?.includes("permission")) {
      throw new Error(
        "❌ Erro de permissões do Firestore!\n\n" +
        "Configure as regras de segurança:\n" +
        "1. Acesse: https://console.firebase.google.com/project/maria-44e49/firestore/rules\n" +
        "2. Substitua as regras por:\n\n" +
        "rules_version = '2';\n" +
        "service cloud.firestore {\n" +
        "  match /databases/{database}/documents {\n" +
        "    match /users/{userId} {\n" +
        "      allow read, write: if request.auth != null;\n" +
        "    }\n" +
        "    match /{document=**} {\n" +
        "      allow read, write: if request.auth != null;\n" +
        "    }\n" +
        "  }\n" +
        "}\n\n" +
        "3. Clique em 'Publish'\n" +
        "4. Tente novamente aqui!"
      );
    } else {
      console.error("❌ Erro ao criar usuário admin:", error);
      throw error;
    }
  }
}
