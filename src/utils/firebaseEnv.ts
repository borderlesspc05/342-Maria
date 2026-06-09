import firebaseConfig from "../lib/firebaseconfig";

/** Verifica se o Firebase está configurado (env ou fallback em firebaseconfig). */
export function isFirebaseConfigured(): boolean {
  const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (typeof envProjectId === "string" && envProjectId.trim().length > 0) {
    return true;
  }
  if (import.meta.env.VITEST) {
    return false;
  }
  const fallback = firebaseConfig?.projectId;
  return typeof fallback === "string" && fallback.trim().length > 0;
}

export function getFirebaseProjectId(): string {
  const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (typeof envProjectId === "string" && envProjectId.trim().length > 0) {
    return envProjectId.trim();
  }
  return firebaseConfig.projectId ?? "";
}
