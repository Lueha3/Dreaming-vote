/**
 * Admin Secret Storage Utility
 * Safe for SSR (checks typeof window !== "undefined")
 */

const STORAGE_KEY = "admin_secret";

export function getAdminSecret(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAdminSecret(value: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, value.trim());
  } catch {
    // Ignore storage errors
  }
}

export function clearAdminSecret(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

