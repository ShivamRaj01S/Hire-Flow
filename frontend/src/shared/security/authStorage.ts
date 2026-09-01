import type { AuthUser } from "./types";

type StoredAuth = {
  user: AuthUser;
  token: string;
};

const KEY = "hireflow.auth.v1";

export function getStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("user" in parsed) ||
      !("token" in parsed)
    ) {
      return null;
    }
    return parsed as StoredAuth;
  } catch {
    return null;
  }
}

export function setStoredAuth(value: StoredAuth) {
  localStorage.setItem(KEY, JSON.stringify(value));
}

export function clearStoredAuth() {
  localStorage.removeItem(KEY);
}

