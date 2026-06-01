import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ slug: string }> | { slug: string } };

const bodySchema = z.object({
  platform: z.enum(["kakao", "instagram", "link_copy", "twitter"]),
});

/**
 * POST /api/reports/[slug]/share
 * 공유 이벤트 기록 — 바이럴 전환율 KPI
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = params instanceof Promise ? await params : params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const report = await prisma.report.findUnique({
    where: { shareSlug: slug },
    select: { id: true },
  });

  if (!report) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  await prisma.shareEvent.create({
    data: { reportId: report.id, platform: parsed.data.platform },
  });

  return NextResponse.json({ ok: true });
}
