import { getAuthUser } from "./auth";
import { hasAtLeast, type Role } from "./roles";

/**
 * /admin(운영) 영역 접근 허용 여부 — RBAC 역할 기반 단일 경로.
 * 로그인 유저의 role이 min 이상이면 허용. superadmin은 SUPERADMIN_EMAILS env로 부트스트랩됨.
 * (레거시 공유 비번 admin_session 쿠키 폴백은 폐기됨 — 역할/부트스트랩 안정화 완료.)
 * Server Component와 Route Handler 양쪽에서 호출 가능(getAuthUser는 next/headers 기반).
 */
export async function hasAdminAreaAccess(min: Role = "staff"): Promise<boolean> {
  const user = await getAuthUser();
  return !!user && hasAtLeast(user.role, min);
}
