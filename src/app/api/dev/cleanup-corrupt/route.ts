import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";

// POST /api/dev/cleanup-corrupt
// 개발 환경에서만 사용 가능한 손상된 모집글 정리 유틸리티
export async function POST(req: NextRequest) {
  // 프로덕션 환경에서는 접근 차단
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { ok: false, error: "This endpoint is only available in development" },
      { status: 403 },
    );
  }

  try {
    console.log("POST /api/dev/cleanup-corrupt");

    // 손상된 모집글 찾기 (title 또는 content에 "???" 포함)
    const corruptedRecruitments = await prisma.recruitment.findMany({
      where: {
        OR: [
          { title: { contains: "???" } },
          { content: { contains: "???" } },
        ],
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (corruptedRecruitments.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No corrupted recruitments found",
        deletedCount: 0,
      });
    }

    const recruitmentIds = corruptedRecruitments.map((r) => r.id);

    // 관련 신청 내역 삭제 (FK 제약조건 때문에 먼저 삭제)
    const deletedApplications = await prisma.application.deleteMany({
      where: {
        recruitmentId: {
          in: recruitmentIds,
        },
      },
    });

    // 손상된 모집글 삭제
    const deletedRecruitments = await prisma.recruitment.deleteMany({
      where: {
        id: {
          in: recruitmentIds,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Corrupted recruitments cleaned up",
      deletedRecruitments: deletedRecruitments.count,
      deletedApplications: deletedApplications.count,
      corruptedIds: recruitmentIds,
    });
  } catch (e: any) {
    console.error("POST /api/dev/cleanup-corrupt failed:", e);
    return NextResponse.json(
      {
        ok: false,
        error: e?.message ?? "Server error",
      },
      { status: 500 },
    );
  }
}

