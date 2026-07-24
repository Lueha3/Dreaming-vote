/**
 * 기질 나침반 결과의 클라이언트 저장 — 게스트 우선 원칙 (02-product.md §5 온보딩).
 * 검사는 로그인 없이 완주 가능해야 바이럴 진입점이 된다. 계정 연동은 후속 작업.
 * localStorage는 사파리 프라이빗 모드 등에서 throw할 수 있어 전부 best-effort.
 */
import type { ChildScores, ParentScores } from "./scoring";

const PARENT_KEY = "hy-parent-scores";
const CHILD_KEY = "hy-child-scores";

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 저장 실패해도 검사 플로우는 계속된다 */
  }
}

export const loadParentScores = () => read<ParentScores>(PARENT_KEY);
export const loadChildScores = () => read<ChildScores>(CHILD_KEY);
export const saveParentScores = (s: ParentScores) => write(PARENT_KEY, s);
export const saveChildScores = (s: ChildScores) => write(CHILD_KEY, s);
export function clearHarmony() {
  try {
    localStorage.removeItem(PARENT_KEY);
    localStorage.removeItem(CHILD_KEY);
  } catch {
    /* noop */
  }
}
