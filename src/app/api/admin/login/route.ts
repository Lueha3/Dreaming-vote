import { NextRequest, NextResponse } from "next/server";

const ADMIN_SECRET = process.env.ADMIN_SECRET;

// POST /api/admin/login
// 관리자 비밀번호를 확인하고 세션 쿠키를 설정합니다.
export async function POST(req: NextRequest) {
  try {
    if (!ADMIN_SECRET) {
      return NextResponse.json(
        { ok: false, error: "ADMIN_SECRET이 서버 환경에 설정되어 있지 않습니다." },
        { status: 500 },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "유효한 JSON 본문이 아닙니다." },
        { status: 400 },
      );
    }

    const { secret } = body as { secret?: string };

    if (!secret || secret.trim() !== ADMIN_SECRET) {
      return NextResponse.json(
        { ok: false, error: "비밀번호가 올바르지 않습니다." },
        { status: 401 },
      );
    }

    // 세션 쿠키 설정
    const res = NextResponse.json({ ok: true });
    res.cookies.set("admin_session", "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7일
    });

    return res;
  } catch (e: any) {
    // Log error message only (no PII)
    console.error("POST /api/admin/login failed:", e?.message ?? "Unknown error");
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

