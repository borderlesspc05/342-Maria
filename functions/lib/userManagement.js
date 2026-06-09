import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as functions from "firebase-functions/v1";
const KNOWN_ROLES = ["admin", "gestor", "colaborador"];
function assertAdmin(context) {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "É necessário estar logado.");
    }
}
async function getRequesterRole(uid) {
    const snap = await getFirestore().collection("users").doc(uid).get();
    return snap.data()?.role ?? null;
}
function validatePassword(password) {
    if (password.length < 6 || !/[A-Z]/.test(password)) {
        throw new functions.https.HttpsError("invalid-argument", "A senha deve ter no mínimo 6 caracteres e pelo menos 1 letra maiúscula.");
    }
}
/**
 * Cria usuário via Admin SDK sem trocar a sessão do admin.
 */
export const createUserByAdmin = functions.https.onCall(async (data, context) => {
    assertAdmin(context);
    const requesterRole = await getRequesterRole(context.auth.uid);
    if (requesterRole !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Apenas administradores podem criar usuários.");
    }
    const email = String(data?.email ?? "").trim().toLowerCase();
    const password = String(data?.password ?? "");
    const name = String(data?.name ?? "").trim();
    const role = (data?.role ?? "colaborador");
    if (!email || email.length < 5) {
        throw new functions.https.HttpsError("invalid-argument", "E-mail inválido.");
    }
    if (!name || name.length < 2) {
        throw new functions.https.HttpsError("invalid-argument", "Nome inválido.");
    }
    if (!KNOWN_ROLES.includes(role)) {
        throw new functions.https.HttpsError("invalid-argument", "Perfil inválido.");
    }
    validatePassword(password);
    const auth = getAuth();
    const db = getFirestore();
    const userRecord = await auth.createUser({
        email,
        password,
        displayName: name,
    });
    await db.collection("users").doc(userRecord.uid).set({
        uid: userRecord.uid,
        name,
        email,
        role,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });
    return { uid: userRecord.uid, name, email, role };
});
/**
 * Remove usuário do Auth e Firestore.
 */
export const deleteUserByAdmin = functions.https.onCall(async (data, context) => {
    assertAdmin(context);
    const requesterRole = await getRequesterRole(context.auth.uid);
    if (requesterRole !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Apenas administradores podem excluir usuários.");
    }
    const uid = String(data?.uid ?? "").trim();
    if (!uid) {
        throw new functions.https.HttpsError("invalid-argument", "UID obrigatório.");
    }
    if (uid === context.auth.uid) {
        throw new functions.https.HttpsError("failed-precondition", "Não é possível excluir o próprio usuário.");
    }
    const db = getFirestore();
    await db.collection("users").doc(uid).delete();
    await getAuth().deleteUser(uid);
    return { success: true };
});
/**
 * Bootstrap do primeiro admin (sem usuário logado).
 * Protegido por variável de ambiente ADMIN_BOOTSTRAP_SECRET.
 */
export const bootstrapAdmin = functions.https.onCall(async (data) => {
    const secret = process.env.ADMIN_BOOTSTRAP_SECRET;
    if (!secret || String(data?.secret ?? "") !== secret) {
        throw new functions.https.HttpsError("permission-denied", "Acesso negado.");
    }
    const db = getFirestore();
    const existing = await db.collection("users").where("role", "==", "admin").limit(1).get();
    if (!existing.empty) {
        throw new functions.https.HttpsError("already-exists", "Já existe um administrador no sistema.");
    }
    const email = String(data?.email ?? "admin@gmail.com").trim().toLowerCase();
    const password = String(data?.password ?? "");
    const name = String(data?.name ?? "Administrador").trim();
    validatePassword(password);
    const auth = getAuth();
    const userRecord = await auth.createUser({
        email,
        password,
        displayName: name,
    });
    await db.collection("users").doc(userRecord.uid).set({
        uid: userRecord.uid,
        name,
        email,
        role: "admin",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });
    return { uid: userRecord.uid, email, name };
});
