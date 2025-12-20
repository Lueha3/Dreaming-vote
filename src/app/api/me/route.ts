import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/session";

// GET /api/me
// 현재 로그인한 사용자의 기본 정보 + 신청 내역 반환
// 항상 JSON 응답을 반환하여 클라이언트가 안전하게 파싱할 수 있도록 합니다.
export async function GET(req: NextRequest) {
  try {
    console.log("GET /api/me");
    
    const userId = req.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        churchCode: true,
        name: true,
        phoneLast4: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "유효하지 않은 세션입니다." },
        { status: 401 },
      );
    }

    // Application은 User와 직접 연결되지 않으므로 빈 배열 반환
    // (Application 모델에는 userId 필드가 없고 contact 기반으로만 식별됨)
    const applications: never[] = [];

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        createdAt: user.createdAt,
        churchCode: user.churchCode,
        phoneLast4: user.phoneLast4,
      },
      applications,
    });
  } catch (e: any) {
    console.error("GET /api/me failed:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Server error" },
      { status: 500 },
    );
  }
}


