/**
 * 글/댓글이 작성 후 수정됐는지 판정.
 * createdAt은 DB now(), updatedAt(@updatedAt)은 Prisma 클라이언트 시계로 각각 찍혀
 * 생성 시점에도 수 ms~수백 ms 오차가 날 수 있다 — 3초 이상 차이날 때만 "수정됨"으로 간주.
 */
export function isEdited(createdAt: string | Date, updatedAt: string | Date): boolean {
  const c = typeof createdAt === "string" ? new Date(createdAt).getTime() : createdAt.getTime();
  const u = typeof updatedAt === "string" ? new Date(updatedAt).getTime() : updatedAt.getTime();
  return u - c > 3000;
}

/** ISO 시각 → "방금/N분 전/N시간 전/N일 전/MM.DD" 상대 표기 (KST 표시) */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}
