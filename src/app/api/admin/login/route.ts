import { NextRequest, NextResponse } from "next/server";

const ADMIN_SECRET = process.env.ADMIN_SECRET;

/** POST /api/admin/login — 관리자 비밀번호 확인 + 쿠키 설정 */
export async function POST(req: NextRequest) {
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
  if (!secret || secret.trim() !== ADMIN_SECRET.trim()) {
    return NextResponse.json({ ok: false, error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_session", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7일
  });

  return res;
}
