// 2차 가입승인(멤버십) 공용 헬퍼 — 신청 폼·관리자 승인·게이트가 공유
export type MembershipStatus = "none" | "pending" | "approved" | "rejected";

export const GENDERS = ["남", "여"] as const;

/**
 * 활동 닉네임 형식("집단-나이-이름") — 단일 출처.
 * 캡처 그룹: [1]=집단, [2]=나이(2자리), [3]=이름.
 * 첫 로그인 시 Prisma nickname에 구글 이름이 폴백 저장되므로,
 * 화면에 '활동 닉네임'으로 표시하거나 변경을 허용할 때 이 형식 검사를 통과해야 한다.
 * (.test()는 캡처 그룹 영향 없음 — 표시 필터·변경 검증이 같은 정규식을 공유.)
 * 러비아·엘리온은 2026-09 유디코 전용 재편 이전의 레거시 집단명 — 신규 생성은 안 하지만
 * 그 시절 승인된 기존 멤버의 닉네임을 계속 인식하기 위해 매칭 대상에는 남겨둔다.
 */
export const NICKNAME_RE = /^(러비아|유디코|엘리온)-(\d{2})-(.+)$/;

/**
 * 나이 → 집단. 앱이 유디코(26~33세) 전용으로 재편되어(2026-09) 이 범위만 소속을 반환한다.
 * 범위 밖이면 null — 가입 신청서·닉네임 변경 등 호출부가 이를 "나이를 다시 확인해달라"는
 * 신호로 써야 한다. 러비아(20~26)·엘리온(34세~)은 재편 이전 레거시 집단이라 더 이상
 * 신규 배정하지 않는다(그 시절 승인된 기존 멤버의 닉네임에는 여전히 남아있을 수 있음).
 */
export function getGroup(age: number): "유디코" | null {
  if (age >= 26 && age <= 33) return "유디코";
  return null;
}

/** 승인 시 자동 생성되는 닉네임: "집단-나이-이름" */
export function buildNickname(age: number, realName: string): string | null {
  const group = getGroup(age);
  const name = realName.trim();
  if (!group || !name) return null;
  return `${group}-${age}-${name}`;
}

/** 전화번호 정규화 — 숫자만 추출해 010-1234-5678 형태로. 형식이 아니면 null */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!/^01[016789]\d{7,8}$/.test(digits)) return null;
  const mid = digits.length === 11 ? 7 : 6;
  return `${digits.slice(0, 3)}-${digits.slice(3, mid)}-${digits.slice(mid)}`;
}
