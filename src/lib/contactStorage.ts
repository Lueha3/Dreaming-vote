/**
 * Contact 저장소 헬퍼 (localStorage 기반)
 * SSR 안전: typeof window !== 'undefined' 체크
 */

const STORAGE_KEY = "bh_contact";

/**
 * 저장된 contact를 가져옵니다 (SSR 안전)
 */
export function getSavedContact(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Contact를 저장합니다
 */
export function setSavedContact(contact: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, contact);
  } catch {
    // localStorage가 사용 불가능한 경우 무시
  }
}

/**
 * 저장된 contact를 삭제합니다
 */
export function clearSavedContact(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage가 사용 불가능한 경우 무시
  }
}

