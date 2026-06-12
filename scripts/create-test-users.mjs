import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBMb7teTg5n_L7ERpWx1LalYqSf3t0BDws",
  authDomain: "maria-44e49.firebaseapp.com",
  projectId: "maria-44e49",
  storageBucket: "maria-44e49.firebasestorage.app",
  messagingSenderId: "744713430025",
  appId: "1:744713430025:web:ece2323d005b100aa004d8",
};

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "123456";

const TEST_USERS = [
  {
    email: "gestor.maria@borderless.dev",
    password: "Gestor@2026",
    name: "Gestor Teste",
    role: "gestor",
  },
  {
    email: "colaborador.maria@borderless.dev",
    password: "Colab@2026",
    name: "Colaborador Teste",
    role: "colaborador",
  },
];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function ensureAdmin() {
  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log("Admin autenticado:", ADMIN_EMAIL);
}

async function createAuthUser(email, password) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data?.error?.message || "Falha ao criar usuário no Auth");
    err.code = data?.error?.message;
    throw err;
  }
  return data.localId;
}

async function upsertUserDoc(uid, user) {
  const ref = doc(db, "users", uid);
  const existing = await getDoc(ref);
  await setDoc(
    ref,
    {
      uid,
      name: user.name,
      email: user.email,
      role: user.role,
      updatedAt: new Date(),
      ...(existing.exists() ? {} : { createdAt: new Date() }),
    },
    { merge: true }
  );
}

async function main() {
  await ensureAdmin();
  const results = [];

  for (const user of TEST_USERS) {
    let uid;
    let status = "criado";

    try {
      uid = await createAuthUser(user.email, user.password);
    } catch (err) {
      if (err.code === "EMAIL_EXISTS") {
        status = "ja_existia_auth";
        const lookup = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: [user.email] }),
          }
        );
        const lookupData = await lookup.json();
        uid = lookupData?.users?.[0]?.localId;
        if (!uid) {
          throw new Error(`Usuário ${user.email} já existe, mas não foi possível obter o UID`);
        }
      } else {
        throw err;
      }
    }

    await upsertUserDoc(uid, user);
    results.push({ ...user, status, uid });
    console.log(`${status === "criado" ? "Criado" : "Atualizado"} (${user.role}):`, user.email);
  }

  console.log("\n=== CREDENCIAIS ===\n");
  for (const r of results) {
    console.log(`${r.role.toUpperCase()}`);
    console.log(`  Email: ${r.email}`);
    console.log(`  Senha: ${r.password}`);
    console.log(`  Status: ${r.status}`);
    console.log(`  UID: ${r.uid}\n`);
  }
}

main().catch((err) => {
  console.error("Erro:", err?.code || err?.message || err);
  process.exit(1);
});
