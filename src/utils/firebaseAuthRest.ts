import firebaseConfig from "../lib/firebaseconfig";

function getApiKey(): string {
  return import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey;
}

/** Cria conta no Firebase Auth via REST sem alterar a sessão atual. */
export async function createAuthUserViaRest(
  email: string,
  password: string
): Promise<string> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${getApiKey()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    const message = data?.error?.message || "Falha ao criar usuário";
    const err = new Error(message) as Error & { code?: string };
    err.code = message;
    throw err;
  }
  return data.localId as string;
}
