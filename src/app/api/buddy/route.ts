import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthUser, membershipGate } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { getClientIp, rateLimitResponse } from "@/lib/rateLimit";
import { findActiveMatch, findPendingBetween, findMyOutgoingPending } from "@/lib/buddy";

const schema = z.object({ targetId: z.string().trim().min(1) });

/**
 * POST /api/buddy — 짝꿍 신청.
 * 규칙(연애 앱화 방지 + 1인 1짝꿍):
 *  - 같은 성별끼리만 신청 가능(성별 미설정도 차단). 꿈터는 달라도 됨.
 *  - 나·상대 모두 활성 짝꿍이 없어야 함.
 *  - 내가 보낸 대기중 신청은 동시에 1건만.
 *  - 상대가 이미 나에게 신청했다면 새로 만들지 않고 안내(받은 신청에서 수락).
 * 상대가 수락하면 active가 된다(PATCH /api/buddy/[id]).
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  const gate = membershipGate(user);
  if (gate) return gate;

  const rl = rateLimitResponse(`buddy-request:${getClientIp(req)}`, { windowMs: 60_000, max: 20 });
  if (rl) return rl;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }
  const targetId = parsed.data.targetId;
  if (targetId === user.dbUserId) {
    return NextResponse.json({ ok: false, error: "나에게는 신청할 수 없어요." }, { status: 400 });
  }

  // 트랜잭션 안에서 자격·중복을 재확인하고 생성 — 동시 신청 경합을 최소화한다.
  const result = await prisma.$transaction(async (tx) => {
    const [me, target] = await Promise.all([
      tx.user.findUnique({
        where: { id: user.dbUserId },
        select: { id: true, nickname: true, gender: true, membershipStatus: true, deletedAt: true },
      }),
      tx.user.findUnique({
        where: { id: targetId },
        select: { id: true, nickname: true, gender: true, membershipStatus: true, deletedAt: true },
      }),
    ]);

    if (!target || target.deletedAt || target.membershipStatus !== "approved") {
      return { error: "짝꿍은 승인된 멤버여야 해요.", status: 400 as const };
    }
    if (!me || me.membershipStatus !== "approved") {
      return { error: "승인된 멤버만 짝꿍을 신청할 수 있어요.", status: 400 as const };
    }
    if (!me.gender || !target.gender) {
      return { error: "성별 정보가 있어야 짝꿍을 신청할 수 있어요.", status: 400 as const };
    }
    if (me.gender !== target.gender) {
      return { error: "짝꿍은 같은 성별끼리만 맺을 수 있어요.", status: 400 as const };
    }

    const [myActive, targetActive, pending, myOutgoing] = await Promise.all([
      findActiveMatch(tx, me.id),
      findActiveMatch(tx, target.id),
      findPendingBetween(tx, me.id, target.id),
      findMyOutgoingPending(tx, me.id),
    ]);

    if (myActive) return { error: "이미 짝꿍이 있어요. 바꾸려면 먼저 해제해주세요.", status: 400 as const };
    if (targetActive) return { error: "이미 짝꿍이 있는 멤버예요.", status: 400 as const };
    if (pending) {
      return pending.requesterId === target.id
        ? { error: "이 멤버가 이미 나에게 신청했어요. 받은 신청에서 수락해주세요.", status: 400 as const }
        : { error: "이미 이 멤버에게 신청했어요.", status: 400 as const };
    }
    if (myOutgoing) return { error: "이미 보낸 신청이 있어요. 응답을 기다려주세요.", status: 400 as const };

    const created = await tx.buddyMatch.create({
      data: { requesterId: me.id, recipientId: target.id },
      select: { id: true },
    });
    return { ok: true as const, matchId: created.id, requesterName: me.nickname, targetId: target.id };
  });

  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }

  // 상대에게 신청 알림 — best-effort.
  try {
    await createNotification({
      userId: result.targetId,
      type: "buddy_request",
      title: "짝꿍 신청이 왔어요 🤝",
      body: `${result.requesterName ?? "누군가"}님이 짝꿍을 신청했어요. 받은 신청에서 수락할 수 있어요.`,
      link: "/my/profile",
    });
  } catch {
    /* best-effort */
  }

  return NextResponse.json({ ok: true, matchId: result.matchId });
}
