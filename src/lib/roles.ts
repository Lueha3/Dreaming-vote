// RBAC(역할 기반 접근제어) 단일 정의 출처.
//
// 설계 결정:
// - User.role 컬럼은 "전역 등급"만 저장한다: member | staff | admin | superadmin.
// - club_leader(동아리장)는 DB에 저장하지 않고 Club.ownerUserId === user.dbUserId로
//   렌더/판정 시점에 파생한다. (소유권 이전·동아리 삭제 시 stale 방지)
// - superadmin은 SUPERADMIN_EMAILS 환경변수로만 부여(부트스트랩) — 관리 UI에서 수동 지정 불가.
// - 외부 표기상 admin/superadmin은 동일하게 "관리자" 배지로 보인다.

export type Role = "member" | "club_leader" | "staff" | "admin" | "superadmin";

// 관리 UI(/manage)에서 수동으로 지정 가능한 전역 등급.
// club_leader(파생) · superadmin(env 전용)은 제외한다.
export type AssignableRole = "member" | "staff" | "admin";
export const ASSIGNABLE_ROLES: readonly AssignableRole[] = ["member", "staff", "admin"];

// 권한 위계 — 숫자가 클수록 강함. hasAtLeast 비교에 사용.
const RANK: Record<Role, number> = {
  member: 0,
  club_leader: 1,
  staff: 2,
  admin: 3,
  superadmin: 4,
};

/** role이 최소 등급(min) 이상인지 — null/undefined는 항상 false(fail-closed). */
export function hasAtLeast(role: Role | null | undefined, min: Role): boolean {
  if (!role) return false;
  return RANK[role] >= RANK[min];
}

/** 관리 영역(/manage·멤버 승인·동아리 승인) 접근 = 운영진 이상. */
export function canManage(role: Role | null | undefined): boolean {
  return hasAtLeast(role, "staff");
}

/** 역할 임명/해임 등 최고 권한 = 관리자 이상. */
export function canAdminister(role: Role | null | undefined): boolean {
  return hasAtLeast(role, "admin");
}

/**
 * actor가 target의 역할을 next로 바꿀 수 있는지 — 권한 상승/탈취 방지의 핵심 게이트.
 * 규칙:
 * - next는 지정 가능 등급(member|staff|admin)만. superadmin·club_leader는 절대 지정 불가.
 * - superadmin: superadmin 대상만 제외하고 무엇이든 지정(admin 부여/회수 포함).
 * - admin: staff/member 관리만. 다른 admin·superadmin 대상은 변경 불가(상호 강등 방지),
 *   admin 등급의 부여/회수는 superadmin 전용(권한 희석·탈취 방지).
 * - staff 이하: 변경 권한 없음.
 * (본인 대상 차단은 호출부에서 별도 처리)
 */
export function canAssignRole(actor: Role, targetCurrent: Role, next: Role): boolean {
  if (!ASSIGNABLE_ROLES.includes(next as AssignableRole)) return false;
  if (actor === "superadmin") {
    return targetCurrent !== "superadmin";
  }
  if (actor === "admin") {
    if (next === "admin") return false; // admin 부여는 superadmin만
    return targetCurrent !== "admin" && targetCurrent !== "superadmin"; // 동급/상위 변경 차단
  }
  return false;
}

// 인증마크(배지) — 3종만 운영: 관리자 · 운영진 · 동아리장.
// member는 배지 없음. superadmin은 외부 표기상 admin과 동일("관리자").
export type BadgeMeta = { label: string; emoji: string };

const ROLE_BADGE: Partial<Record<Role, BadgeMeta>> = {
  club_leader: { label: "동아리장", emoji: "👑" },
  staff: { label: "운영진", emoji: "⭐" },
  admin: { label: "관리자", emoji: "🛡️" },
  superadmin: { label: "관리자", emoji: "🛡️" },
};

/** 해당 역할의 배지 정보. 배지가 없는 역할(member)이면 null. */
export function roleBadge(role: Role | null | undefined): BadgeMeta | null {
  if (!role) return null;
  return ROLE_BADGE[role] ?? null;
}

/**
 * 한 유저가 표시할 배지 역할 목록.
 * - 전역 역할 배지(운영진/관리자) + 동아리장(소유 동아리에서 파생)을 함께 보여준다.
 *   (예: 운영진이면서 동아리장 → [staff, club_leader])
 * - member·비로그인이거나 동아리장도 아니면 빈 배열.
 */
export function displayRoles(
  role: Role | null | undefined,
  opts?: { isClubLeader?: boolean },
): Role[] {
  const out: Role[] = [];
  if (role && roleBadge(role)) out.push(role); // staff | admin | superadmin
  if (opts?.isClubLeader && !out.includes("club_leader")) out.push("club_leader");
  return out;
}
