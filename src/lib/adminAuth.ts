import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

/**
 * 관리자 세션 토큰 — ADMIN_SECRET에서 파생된 HMAC.
 * 쿠키 값이 추측 가능한 상수("1")였던 결함을 대체한다.
 * ADMIN_SECRET을 바꾸면 모든 관리자 세션이 즉시 무효화된다.
 */
export function adminSessionToken(): string | null {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return null;
  return createHmac("sha256", secret).update("admin-session-v1").digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** API Route용 — admin_session 쿠키가 유효한 토큰인지 검증 */
export function isAdminRequest(req: NextRequest): boolean {
  const token = adminSessionToken();
  const cookie = req.cookies.get("admin_session")?.value;
  if (!token || !cookie) return false;
  return safeEqual(cookie, token);
}

/** 서버 컴포넌트(layout)용 — 쿠키 값 직접 검증 */
export function isAdminCookieValue(value: string | undefined): boolean {
  const token = adminSessionToken();
  if (!token || !value) return false;
  return safeEqual(value, token);
}
