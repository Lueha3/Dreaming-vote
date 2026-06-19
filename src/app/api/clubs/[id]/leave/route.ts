import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthUser, membershipGate } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

type Params = { params: Promise<{ id: string }> | { id: string } };

/**
 * POST /api/clubs/[id]/leave
 * 본인이 가입한(accepted) 동아리에서 스스로 나가기 — status "left".
 * (개설자는 application이 아니라 ownerUserId로 표현되므로 여기 해당 없음 → 먼저 동아리장 승계 필요)
 */
export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = params instanceof Promise ? await params : params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }
  const gate = membershipGate(user);
  if (gate) return gate;

  const app = await prisma.clubApplication.findUnique({
    where: { clubId_userId: { clubId: id, userId: user.dbUserId } },
    select: { id: true, status: true, club: { select: { name: true, ownerUserId: true } } },
  });
  if (!app || app.status !== "accepted") {
    return NextResponse.json({ ok: false, error: "가입한 동아리가 아니에요." }, { status: 400 });
  }

  await prisma.clubApplication.update({ where: { id: app.id }, data: { status: "left" } });

  // 개설자에게 멤버 이탈 알림 (best-effort)
  try {
    await createNotification({
      userId: app.club.ownerUserId,
      type: "club_member_left",
      title: "멤버가 동아리를 나갔어요",
      body: `${user.nickname ?? "한 멤버"}님이 '${app.club.name}'에서 나갔어요.`,
      link: "/my/clubs",
    });
  } catch {
    /* best-effort */
  }

  return NextResponse.json({ ok: true });
}
