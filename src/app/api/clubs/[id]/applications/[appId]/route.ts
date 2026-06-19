import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthUser, membershipGate } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

type Params = {
  params: Promise<{ id: string; appId: string }> | { id: string; appId: string };
};

const actionSchema = z.object({ action: z.enum(["accept", "reject"]) });

/**
 * POST /api/clubs/[id]/applications/[appId]
 * 가입 신청 수락/반려 (개설자 본인만). body: { action: "accept" | "reject" }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id, appId } = params instanceof Promise ? await params : params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }
  const gate = membershipGate(user);
  if (gate) return gate;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }
  const { action } = parsed.data;

  const club = await prisma.club.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      ownerUserId: true,
      maxMembers: true,
      _count: { select: { applications: { where: { status: "accepted" } } } },
    },
  });
  if (!club) {
    return NextResponse.json({ ok: false, error: "동아리를 찾을 수 없습니다." }, { status: 404 });
  }
  if (club.ownerUserId !== user.dbUserId) {
    return NextResponse.json({ ok: false, error: "권한이 없습니다." }, { status: 403 });
  }

  const app = await prisma.clubApplication.findUnique({
    where: { id: appId },
    select: { id: true, clubId: true, status: true, userId: true },
  });
  if (!app || app.clubId !== id) {
    return NextResponse.json({ ok: false, error: "신청을 찾을 수 없습니다." }, { status: 404 });
  }

  const targetStatus = action === "accept" ? "accepted" : "rejected";
  // 멱등 처리: 이미 같은 상태면 아무것도 안 한다.
  // (안 그러면 개설자가 수락/반려를 반복 POST할 때마다 신청자에게 알림이 무한 생성된다)
  const statusChanged = app.status !== targetStatus;

  if (action === "accept" && statusChanged && club.maxMembers && club._count.applications >= club.maxMembers) {
    return NextResponse.json({ ok: false, error: "정원이 가득 찼습니다." }, { status: 409 });
  }

  if (statusChanged) {
    await prisma.clubApplication.update({ where: { id: appId }, data: { status: targetStatus } });

    // 신청자에게 결과 알림 — 상태가 실제로 바뀐 경우에만(best-effort)
    try {
      await createNotification({
        userId: app.userId,
        type: action === "accept" ? "club_application_accepted" : "club_application_rejected",
        title: action === "accept" ? "동아리 가입이 수락됐어요 🎉" : "동아리 가입 신청 결과",
        body:
          action === "accept"
            ? `'${club.name}' 가입이 수락됐어요. 이제 모임 일정을 확인할 수 있어요!`
            : `아쉽지만 '${club.name}' 가입 신청이 받아들여지지 않았어요.`,
        link: `/clubs/${id}`,
      });
    } catch {
      /* best-effort */
    }
  }

  return NextResponse.json({ ok: true });
}
