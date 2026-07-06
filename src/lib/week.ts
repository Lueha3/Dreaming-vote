/**
 * KST 기준 date가 속한 주의 월요일 날짜를 구해, 그 Y-M-D를 UTC 자정으로 저장할 키로 반환.
 * (MetricSnapshot.weekOf와 동일한 관례 — 정확한 순간이 아니라 "그 주"를 가리키는 식별자로만 사용.)
 */
export function getWeekMonday(date: Date): Date {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const day = kst.getUTCDay(); // 0=일 ... 6=토, 1=월
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() + diffToMonday));
}
