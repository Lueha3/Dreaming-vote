import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthUser, roleGate } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { recordAudit } from "@/lib/audit";
import { getClientIp, rateLimitResponse } from "@/lib/rateLimit";

type Params = { params: Promise<{ id: string }> | { id: string } };

const schema = z.object({ buddyId: z.string().trim().min(1) });

/**
 * POST /api/manage/membership/[id]/buddy
 * 새가족의 환영 짝꿍 지정(운영진 이상). 이미 지정돼 있으면 교체(upsert) —
 * 재배정 시나리오(짝꿍이 활동 중단 등)를 별도 API 없이 같은 엔드포인트로 처리.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const actor = await getAuthUser();
  const gate = roleGate(actor, "staff");
  if (gate) return gate;

  const rl = rateLimitResponse(`buddy-assign:${getClientIp(req)}`, { windowMs: 60_000, max: 30 });
  if (rl) return rl;

  const { id } = params instanceof Promise ? await params : params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }
  const { buddyId } = parsed.data;

  if (buddyId === id) {
    return NextResponse.json({ ok: false, error: "본인을 짝꿍으로 지정할 수 없어요." }, { status: 400 });
  }

  const [newcomer, buddy] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: { id: true, nickname: true, membershipStatus: true, deletedAt: true },
    }),
    prisma.user.findUnique({
      where: { id: buddyId },
      select: { id: true, nickname: true, membershipStatus: true, deletedAt: true },
    }),
  ]);

  if (!newcomer || newcomer.deletedAt || newcomer.membershipStatus !== "approved") {
    return NextResponse.json({ ok: false, error: "승인된 멤버만 짝꿍을 지정할 수 있어요." }, { status: 400 });
  }
  if (!buddy || buddy.deletedAt || buddy.membershipStatus !== "approved") {
    return NextResponse.json({ ok: false, error: "짝꿍은 승인된 멤버여야 해요." }, { status: 400 });
  }

  await prisma.buddyMatch.upsert({
    where: { newcomerId: id },
    update: { buddyId, matchedById: actor!.dbUserId, status: "active", endedAt: null },
    create: { newcomerId: id, buddyId, matchedById: actor!.dbUserId },
  });

  // 상호 알림 — best-effort(실패해도 매칭 자체는 유효).
  try {
    await createNotification({
      userId: buddyId,
      type: "buddy_assigned",
      title: "환영 짝꿍으로 지정됐어요 🤝",
      body: `${newcomer.nickname ?? "새가족"}님의 환영 짝꿍이 되어주세요! 먼저 인사해주시면 좋아요.`,
      link: "/my/profile",
    });
  } catch {
    /* best-effort */
  }
  try {
    await createNotification({
      userId: id,
      type: "buddy_matched",
      title: "나의 환영 짝꿍이 정해졌어요 🤝",
      body: `${buddy.nickname ?? "환영 짝꿍"}님이 도와주실 거예요. 편하게 먼저 인사해보세요!`,
      link: "/my/profile",
    });
  } catch {
    /* best-effort */
  }

  try {
    await recordAudit({
      actor,
      action: "buddy_match_assign",
      targetType: "user",
      targetId: id,
      summary: `환영 짝꿍 지정: ${newcomer.nickname ?? "no-nickname"} ↔ ${buddy.nickname ?? "no-nickname"}`,
      ip: getClientIp(req),
    });
  } catch {
    /* best-effort */
  }

  return NextResponse.json({ ok: true });
}
