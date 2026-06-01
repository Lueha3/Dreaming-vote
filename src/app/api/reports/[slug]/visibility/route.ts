import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ slug: string }> | { slug: string } };

/** PATCH /api/reports/[slug]/visibility — 공개/비공개 토글 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { slug } = params instanceof Promise ? await params : params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });

  const report = await prisma.report.findUnique({
    where: { shareSlug: slug },
    select: { userId: true, isPublic: true },
  });
  if (!report) return NextResponse.json({ ok: false, error: "리포트를 찾을 수 없습니다." }, { status: 404 });
  if (report.userId !== user.dbUserId)
    return NextResponse.json({ ok: false, error: "권한이 없습니다." }, { status: 403 });

  const { isPublic } = await req.json();
  await prisma.report.update({ where: { shareSlug: slug }, data: { isPublic } });

  return NextResponse.json({ ok: true, isPublic });
}
