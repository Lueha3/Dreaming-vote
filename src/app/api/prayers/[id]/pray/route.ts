import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, membershipGate } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> | { id: string } };

/** POST /api/prayers/[id]/pray — "기도했어요" 토글 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = params instanceof Promise ? await params : params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  const gate = membershipGate(user);
  if (gate) return gate;

  const existing = await prisma.prayerIntercession.findUnique({
    where: { prayerId_userId: { prayerId: id, userId: user.dbUserId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.prayerIntercession.delete({ where: { id: existing.id } });
  } else {
    // 기도제목 존재 확인 후 생성
    const prayer = await prisma.prayer.findUnique({ where: { id }, select: { id: true } });
    if (!prayer) return NextResponse.json({ ok: false, error: "기도제목을 찾을 수 없습니다." }, { status: 404 });
    await prisma.prayerIntercession.create({ data: { prayerId: id, userId: user.dbUserId } });
  }

  const count = await prisma.prayerIntercession.count({ where: { prayerId: id } });
  return NextResponse.json({ ok: true, iPrayed: !existing, prayCount: count });
}
