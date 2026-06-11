import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { adminSessionToken } from "@/lib/adminAuth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const ADMIN_SECRET = process.env.ADMIN_SECRET;

/** 길이 정보까지 숨기는 상수시간 비교 — 양쪽을 HMAC으로 다이제스트 후 비교 */
function secretMatches(input: string, expected: string): boolean {
  const a = createHmac("sha256", "admin-login-cmp").update(input).digest();
  const b = createHmac("sha256", "admin-login-cmp").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** POST /api/admin/login — 관리자 비밀번호 확인 + 쿠키 설정 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`admin-login:${ip}`, { windowMs: 60_000, max: 5 })) {
    return NextResponse.json(
      { ok: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  if (!ADMIN_SECRET) {
    return NextResponse.json({ ok: false, error: "ADMIN_SECRET이 설정되지 않았습니다." }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { secret } = body as { secret?: string };
  if (!secret || !secretMatches(secret.trim(), ADMIN_SECRET.trim())) {
    return NextResponse.json({ ok: false, error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const token = adminSessionToken();
  if (!token) {
    return NextResponse.json({ ok: false, error: "ADMIN_SECRET이 설정되지 않았습니다." }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7일
  });

  return res;
}
