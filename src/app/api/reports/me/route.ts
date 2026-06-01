import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/reports/me
 * 내 리포트 목록 (최신순)
 */
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  const reports = await prisma.report.findMany({
    where: { userId: user.dbUserId },
    orderBy: { createdAt: "desc" },
    select: {
      shareSlug: true,
      catchphrase: true,
      coreTraits: true,
      sourceAi: true,
      isPublic: true,
      viewCount: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, items: reports });
}
