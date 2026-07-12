import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthUser, membershipGate } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { getClientIp, rateLimitResponse } from "@/lib/rateLimit";
import { findActiveMatch } from "@/lib/buddy";

type Params = { params: Promise<{ id: string }> | { id: string } };

const schema = z.object({ action: z.enum(["accept", "decline", "cancel", "end"]) });

/**
 * PATCH /api/buddy/[id] — 짝꿍 신청/관계 상태 전이.
 *  - accept  : 받은 사람이 대기중 신청을 수락 → active. (양쪽 활성 짝꿍 재확인 + 나머지 대기 신청 정리)
 *  - decline : 받은 사람이 대기중 신청을 거절.
 *  - cancel  : 신청한 사람이 자기 대기중 신청을 취소.
 *  - end     : 양쪽 중 한 명이 활성 짝꿍 관계를 해제.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  const gate = membershipGate(user);
  if (gate) return gate;

  const rl = rateLimitResponse(`buddy-respond:${getClientIp(req)}`, { windowMs: 60_000, max: 40 });
  if (rl) return rl;

  const { id } = params instanceof Promise ? await params : params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }
  const action = parsed.data.action;
  const me = user.dbUserId;

  const result = await prisma.$transaction(async (tx) => {
    const match = await tx.buddyMatch.findUnique({ where: { id } });
    if (!match) return { error: "짝꿍 신청을 찾을 수 없어요.", status: 404 as const };

    if (action === "accept" || action === "decline") {
      if (match.recipientId !== me) return { error: "권한이 없어요.", status: 403 as const };
      if (match.status !== "pending") return { error: "이미 처리된 신청이에요.", status: 400 as const };

      if (action === "decline") {
        await tx.buddyMatch.update({
          where: { id },
          data: { status: "declined", respondedAt: new Date() },
        });
        return { ok: true as const, kind: "declined" as const };
      }

      // accept — 수락 시점에 양쪽 모두 활성 짝꿍이 없어야 성사.
      const [myActive, requesterActive] = await Promise.all([
        findActiveMatch(tx, me),
        findActiveMatch(tx, match.requesterId),
      ]);
      if (myActive || requesterActive) {
        await tx.buddyMatch.update({
          where: { id },
          data: { status: "declined", respondedAt: new Date() },
        });
        return { error: "그새 다른 짝꿍이 생겨서 수락할 수 없어요.", status: 409 as const };
      }

      await tx.buddyMatch.update({
        where: { id },
        data: { status: "active", respondedAt: new Date() },
      });
      // 두 사람이 얽힌 다른 대기중 신청은 모두 정리(중복 성사 방지).
      await tx.buddyMatch.updateMany({
        where: {
          id: { not: id },
          status: "pending",
          OR: [
            { requesterId: me },
            { recipientId: me },
            { requesterId: match.requesterId },
            { recipientId: match.requesterId },
          ],
        },
        data: { status: "declined", respondedAt: new Date() },
      });
      const requester = await tx.user.findUnique({
        where: { id: match.requesterId },
        select: { nickname: true },
      });
      const recipient = await tx.user.findUnique({ where: { id: me }, select: { nickname: true } });
      return {
        ok: true as const,
        kind: "accepted" as const,
        requesterId: match.requesterId,
        recipientName: recipient?.nickname ?? null,
        requesterName: requester?.nickname ?? null,
      };
    }

    if (action === "cancel") {
      if (match.requesterId !== me) return { error: "권한이 없어요.", status: 403 as const };
      if (match.status !== "pending") return { error: "취소할 수 없는 신청이에요.", status: 400 as const };
      await tx.buddyMatch.update({ where: { id }, data: { status: "ended", endedAt: new Date() } });
      return { ok: true as const, kind: "canceled" as const };
    }

    // end — 활성 관계 해제(양쪽 누구나).
    if (match.requesterId !== me && match.recipientId !== me) {
      return { error: "권한이 없어요.", status: 403 as const };
    }
    if (match.status !== "active") return { error: "해제할 수 없는 관계예요.", status: 400 as const };
    await tx.buddyMatch.update({ where: { id }, data: { status: "ended", endedAt: new Date() } });
    const otherId = match.requesterId === me ? match.recipientId : match.requesterId;
    return { ok: true as const, kind: "ended" as const, otherId };
  });

  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }

  // 알림 — best-effort.
  try {
    if (result.kind === "accepted") {
      await createNotification({
        userId: result.requesterId,
        type: "buddy_accepted",
        title: "짝꿍 신청이 수락됐어요 🤝",
        body: `${result.recipientName ?? "상대"}님과 짝꿍이 됐어요! 편하게 먼저 인사해보세요.`,
        link: "/my/profile",
      });
    } else if (result.kind === "ended") {
      await createNotification({
        userId: result.otherId,
        type: "buddy_ended",
        title: "짝꿍 관계가 마무리됐어요 🫂",
        body: "그동안 고마웠어요. 새로운 짝꿍을 찾아볼 수 있어요.",
        link: "/my/profile",
      });
    }
  } catch {
    /* best-effort */
  }

  return NextResponse.json({ ok: true });
}
