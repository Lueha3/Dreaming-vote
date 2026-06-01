import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ slug: string }> | { slug: string } };

/**
 * GET /api/reports/[slug]
 * 공개 리포트 조회 + 조회수 증가
 * 비로그인 허용 — 공유 URL로 누구나 열람 가능
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = params instanceof Promise ? await params : params;

  const report = await prisma.report.findUnique({
    where: { shareSlug: slug },
    select: {
      shareSlug: true,
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

  if (!report) {
    return NextResponse.json({ ok: false, error: "리포트를 찾을 수 없습니다." }, { status: 404 });
  }

  // 조회수 비동기 증가 (응답 지연 없이)
  prisma.report
    .update({ where: { shareSlug: slug }, data: { viewCount: { increment: 1 } } })
    .catch(() => {});

  return NextResponse.json({ ok: true, report });
}
