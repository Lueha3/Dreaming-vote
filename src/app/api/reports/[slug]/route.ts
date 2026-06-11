import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

type Params = { params: Promise<{ slug: string }> | { slug: string } };

const NOT_FOUND = NextResponse.json(
  { ok: false, error: "리포트를 찾을 수 없습니다." },
  { status: 404 },
);

/**
 * GET /api/reports/[slug]
 * 공개 리포트 조회 + 조회수 증가
 * 비공개 리포트는 소유자만 열람 가능
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = params instanceof Promise ? await params : params;

  const report = await prisma.report.findUnique({
    where: { shareSlug: slug },
    select: {
      shareSlug: true,
      isPublic: true,
      userId: true,
      catchphrase: true,
      coreTraits: true,
      optimalEcosystem: true,
      corePosition: true,
      sourceAi: true,
      viewCount: true,
      createdAt: true,
      user: { select: { nickname: true } },
    },
  });

  if (!report) return NOT_FOUND;

  if (!report.isPublic) {
    const viewer = await getAuthUser();
    if (!viewer || viewer.dbUserId !== report.userId) return NOT_FOUND;
  }

  // 조회수 비동기 증가 (응답 지연 없이)
  prisma.report
    .update({ where: { shareSlug: slug }, data: { viewCount: { increment: 1 } } })
    .catch(() => {});

  const { isPublic: _, userId: __, ...safeReport } = report;
  return NextResponse.json({ ok: true, report: safeReport });
}
