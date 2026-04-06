import { auth, db } from "../lib/firebaseconfig";
import { doc, getDoc } from "firebase/firestore";
import type { User } from "../types/user";

export type UserRole = "admin" | "gestor" | "colaborador";
export interface DataScope {
  uid: string;
  role: UserRole;
  isPrivileged: boolean;
}

const ROLE_SET: UserRole[] = ["admin", "gestor", "colaborador"];
const ROLE_CACHE_TTL_MS = 60_000;

let cachedUser: { uid: string; role: UserRole; expiresAt: number } | null = null;

function isKnownRole(role: unknown): role is UserRole {
  return typeof role === "string" && ROLE_SET.includes(role as UserRole);
}

function currentUidOrThrow(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error("Usuário não autenticado.");
  }
  return uid;
}

export async function getCurrentUserRole(): Promise<UserRole> {
  const uid = currentUidOrThrow();

  if (cachedUser && cachedUser.uid === uid && cachedUser.expiresAt > Date.now()) {
    return cachedUser.role;
  }

  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) {
    throw new Error("Perfil de usuário não encontrado.");
  }

  const data = snap.data() as Partial<User>;
  const role = data.role;
  if (!isKnownRole(role)) {
    throw new Error("Role de usuário inválida.");
  }

  cachedUser = {
    uid,
    role,
    expiresAt: Date.now() + ROLE_CACHE_TTL_MS,
  };

  return role;
}

export function clearSecurityCache(): void {
  cachedUser = null;
}

export async function assertAuthenticated(): Promise<string> {
  return currentUidOrThrow();
}

export async function assertRole(allowedRoles: UserRole[], actionLabel?: string): Promise<{ uid: string; role: UserRole }> {
  const uid = currentUidOrThrow();
  const role = await getCurrentUserRole();

  if (!allowedRoles.includes(role)) {
    const action = actionLabel ? ` para ${actionLabel}` : "";
    throw new Error(`Você não tem permissão${action}.`);
  }

  return { uid, role };
}

export async function assertOwnerOrRole(ownerUid: string, allowedRoles: UserRole[], actionLabel?: string): Promise<{ uid: string; role: UserRole }> {
  const uid = currentUidOrThrow();
  const role = await getCurrentUserRole();

  if (uid !== ownerUid && !allowedRoles.includes(role)) {
    const action = actionLabel ? ` para ${actionLabel}` : "";
    throw new Error(`Você não tem permissão${action}.`);
  }

  return { uid, role };
}

export function isPrivilegedRole(role: UserRole): boolean {
  return role === "admin" || role === "gestor";
}

export async function getDataScope(
  allowedRoles: UserRole[],
  actionLabel?: string
): Promise<DataScope> {
  const { uid, role } = await assertRole(allowedRoles, actionLabel);
  return {
    uid,
    role,
    isPrivileged: isPrivilegedRole(role),
  };
}

export function validateRequiredString(value: unknown, fieldLabel: string, min = 1, max = 200): string {
  if (typeof value !== "string") {
    throw new Error(`${fieldLabel} inválido.`);
  }
  const sanitized = value.trim();
  if (sanitized.length < min) {
    throw new Error(`${fieldLabel} é obrigatório.`);
  }
  if (sanitized.length > max) {
    throw new Error(`${fieldLabel} excede o limite permitido.`);
  }
  return sanitized;
}

export function validateEmail(value: unknown): string {
  const email = validateRequiredString(value, "E-mail", 5, 254).toLowerCase();
  const isValid = /^\S+@\S+\.\S+$/.test(email);
  if (!isValid) {
    throw new Error("E-mail inválido.");
  }
  return email;
}

export function validateRole(value: unknown): UserRole {
  if (!isKnownRole(value)) {
    throw new Error("Role inválida.");
  }
  return value;
}

export function validatePositiveNumber(value: unknown, fieldLabel: string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${fieldLabel} deve ser maior que zero.`);
  }
  return parsed;
}
