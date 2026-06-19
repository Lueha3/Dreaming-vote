import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, membershipGate } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { createNotification } from "@/lib/notifications";

type Params = { params: Promise<{ id: string }> | { id: string } };

/** POST /api/prayers/[id]/pray — 반응 토글 ("기도할게요"/"공감", 카테고리 무관 단일 반응) */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = params instanceof Promise ? await params : params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  const gate = membershipGate(user);
  if (gate) return gate;

  // 토글 스팸(생성/삭제 반복 DB 처닝) 방지 — 유저 단위(공유 IP 무관) 한도.
  if (!checkRateLimit(`react:${user.dbUserId}`, { windowMs: 60_000, max: 60 })) {
    return NextResponse.json(
      { ok: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  const existing = await prisma.prayerIntercession.findUnique({
    where: { prayerId_userId: { prayerId: id, userId: user.dbUserId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.prayerIntercession.delete({ where: { id: existing.id } });
  } else {
    // 글 존재 확인 후 생성
    const prayer = await prisma.prayer.findUnique({
      where: { id },
      select: { id: true, userId: true, category: true },
    });
    if (!prayer) return NextResponse.json({ ok: false, error: "글을 찾을 수 없습니다." }, { status: 404 });
    await prisma.prayerIntercession.create({ data: { prayerId: id, userId: user.dbUserId } });

    // 글쓴이에게 "첫 공감" 알림 1회만 (본인 반응 제외, 토글 반복·여러 명 반응에도 중복 안 함).
    // link가 글마다 고유(/prayer?category=..#<id>)라 동일 글 기존 알림 유무로 dedup. best-effort.
    // (한계: findFirst→create가 비원자적이라 서로 다른 두 명이 ms 단위로 동시에 첫 반응하면
    //  드물게 2건 생길 수 있음 — 저트래픽·UX 한정이라 유니크 제약까진 두지 않음.)
    if (prayer.userId !== user.dbUserId) {
      try {
        const link = `/prayer?category=${encodeURIComponent(prayer.category)}#${id}`;
        const already = await prisma.notification.findFirst({
          where: { userId: prayer.userId, type: "prayer_intercession", link },
          select: { id: true },
        });
        if (!already) {
          await createNotification({
            userId: prayer.userId,
            type: "prayer_intercession",
            title: "누군가 내 글에 마음을 보탰어요 🙏",
            body: "광장 글에 공감·기도 반응이 달렸어요.",
            link,
          });
        }
      } catch {
        /* best-effort */
      }
    }
  }

  const count = await prisma.prayerIntercession.count({ where: { prayerId: id } });
  return NextResponse.json({ ok: true, iReacted: !existing, reactionCount: count });
}
