/**
 * KST 기준 date가 속한 달의 1일 자정을 UTC로 저장할 키로 반환.
 * (week.ts의 getWeekMonday와 동일한 관례 — 정확한 순간이 아니라 "그 달"을 가리키는 식별자로만 사용.)
 */
export function getMonthStart(date: Date): Date {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), 1));
}
