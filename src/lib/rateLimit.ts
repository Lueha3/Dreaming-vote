/**
 * IP 기반 인메모리 Rate Limit
 * dreaming-vote의 /api/apply 라우트에서 추출·범용화
 *
 * 주의: Vercel 서버리스 환경에서는 인스턴스별 독립 동작 (완벽한 글로벌 제한 아님)
 * 완벽한 제한이 필요하면 Upstash Redis로 교체
 */
const rateLimitMap = new Map<string, number[]>();

type RateLimitOptions = {
  windowMs: number; // 시간 창 (ms)
  max: number;      // 최대 요청 수
};

export function checkRateLimit(
  key: string,
  options: RateLimitOptions = { windowMs: 60_000, max: 3 },
): boolean {
  const now = Date.now();
  const { windowMs, max } = options;

  const timestamps = (rateLimitMap.get(key) ?? []).filter(
    (ts) => now - ts < windowMs,
  );

  if (timestamps.length >= max) return false;

  timestamps.push(now);
  rateLimitMap.set(key, timestamps);

  // 메모리 누수 방지: 1000개 초과 시 오래된 IP 정리
  if (rateLimitMap.size > 1000) {
    for (const [key, ts] of rateLimitMap) {
      if (!ts.some((t) => now - t < windowMs * 2)) {
        rateLimitMap.delete(key);
      }
    }
  }

  return true;
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
