// 슈퍼관리자 부트스트랩 — 최초 관리자를 코드/DB 수정 없이 환경변수로 지정한다.
//
// SUPERADMIN_EMAILS=a@x.com,b@y.com  (쉼표 구분, 대소문자 무시)
// - 비어 있으면 아무도 superadmin이 아님(fail-closed). ADMIN_SECRET처럼 부재 시 500을 내지 않는다.
// - 서버 전용 — 절대 NEXT_PUBLIC_ 접두사 금지(클라이언트 번들 유출 방지).
// - 모듈 로드 시 1회 파싱 → Vercel에서 값 변경 시 재배포 필요(ADMIN_SECRET과 동일 특성).

const SUPERADMIN_EMAILS = new Set(
  (process.env.SUPERADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

/** 이메일이 슈퍼관리자 목록에 포함되는지(대소문자 무시). null/빈값은 false. */
export function isSuperadminEmail(email: string | null | undefined): boolean {
  return !!email && SUPERADMIN_EMAILS.has(email.trim().toLowerCase());
}

/** 슈퍼관리자 이메일 목록(소문자, 배열) — DB role과 무관한 env 부트스트랩 목록을 조회할 때 사용. */
export function getSuperadminEmails(): string[] {
  return [...SUPERADMIN_EMAILS];
}
