// 새가족 판정 — 가입 승인 후 일정 기간 '새가족' 배지를 보여줘 기존 멤버가
// 먼저 다가갈 신호를 준다. 저장하지 않고 membershipDecidedAt에서 매번 파생 계산한다
// (탈퇴 후 재가입 시 재승인 시각 기준으로 다시 새가족이 되는 것도 의도된 동작).
export const NEWCOMER_WINDOW_DAYS = 45;

export function isNewcomer(membershipDecidedAt: Date | string | null): boolean {
  if (!membershipDecidedAt) return false;
  const decided = new Date(membershipDecidedAt).getTime();
  const elapsedMs = Date.now() - decided;
  return elapsedMs >= 0 && elapsedMs <= NEWCOMER_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}
