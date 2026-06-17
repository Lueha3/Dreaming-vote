import { cookies } from "next/headers";
import { getAuthUser } from "./auth";
import { hasAtLeast, type Role } from "./roles";
import { isAdminCookieValue } from "./adminAuth";

/**
 * /admin(운영) 영역 접근 허용 여부.
 * - 1순위(RBAC): 로그인 유저의 role이 min 이상.
 * - 폴백(과도기): 레거시 공유 비번 admin_session 쿠키 — 잠금 방지용. 역할/부트스트랩 안정화 후 제거 예정.
 * Server Component와 Route Handler 양쪽에서 호출 가능(getAuthUser·cookies 모두 next/headers 기반).
 */
export async function hasAdminAreaAccess(min: Role = "staff"): Promise<boolean> {
  const user = await getAuthUser();
  if (user && hasAtLeast(user.role, min)) return true;

  const cookieStore = await cookies();
  return isAdminCookieValue(cookieStore.get("admin_session")?.value);
}
