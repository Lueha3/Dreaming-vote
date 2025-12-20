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
      include: {
        applications: {
          include: {
            recruitment: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "유효하지 않은 세션입니다." },
        { status: 401 },
      );
    }

    // 필요 없는 필드 제거/정제해서 내려주고 싶다면 여기서 가공
    const applications = user.applications.map((app) => ({
      id: app.id,
      createdAt: app.createdAt,
      recruitment: {
        id: app.recruitment.id,
        title: app.recruitment.title,
        status: app.recruitment.status,
        capacity: app.recruitment.capacity,
        appliedCount: app.recruitment.appliedCount,
        createdAt: app.recruitment.createdAt,
        updatedAt: app.recruitment.updatedAt,
      },
    }));

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


