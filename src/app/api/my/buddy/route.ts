import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { findActiveMatch } from "@/lib/buddy";

type PersonLite = { nickname: string | null; avatarUrl: string | null };
const personSelect = { select: { id: true, nickname: true, avatarUrl: true } } as const;

/**
 * GET /api/my/buddy — 본인의 짝꿍 현황.
 *  - current: 현재 활성 짝꿍(있으면) + 관계 해제용 matchId
 *  - incoming: 나에게 온 대기중 신청들(수락/거절용)
 *  - outgoing: 내가 보낸 대기중 신청(취소용)
 */
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  const me = user.dbUserId;

  const active = await findActiveMatch(prisma, me);

  const [incomingRaw, outgoing, activeOther] = await Promise.all([
    prisma.buddyMatch.findMany({
      where: { recipientId: me, status: "pending" },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, requester: personSelect },
    }),
    prisma.buddyMatch.findFirst({
      where: { requesterId: me, status: "pending" },
      select: { id: true, createdAt: true, recipient: personSelect },
    }),
    active
      ? prisma.user.findUnique({
          where: { id: active.requesterId === me ? active.recipientId : active.requesterId },
          ...personSelect,
        })
      : Promise.resolve(null),
  ]);

  const current =
    active && activeOther
      ? {
          matchId: active.id,
          person: { nickname: activeOther.nickname, avatarUrl: activeOther.avatarUrl } as PersonLite,
        }
      : null;

  return NextResponse.json({
    ok: true,
    current,
    incoming: incomingRaw.map((r) => ({
      matchId: r.id,
      person: { nickname: r.requester.nickname, avatarUrl: r.requester.avatarUrl },
    })),
    outgoing: outgoing
      ? {
          matchId: outgoing.id,
          person: { nickname: outgoing.recipient.nickname, avatarUrl: outgoing.recipient.avatarUrl },
        }
      : null,
  });
}
