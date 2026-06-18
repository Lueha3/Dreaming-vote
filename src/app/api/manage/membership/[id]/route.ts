import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthUser, roleGate } from "@/lib/auth";
import { createMembershipNotification } from "@/lib/notifications";
import { rateLimitResponse, getClientIp } from "@/lib/rateLimit";

type Params = { params: Promise<{ id: string }> | { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  const gate = roleGate(user, "staff");
  if (gate) return gate;

  const rl = rateLimitResponse(`membership-decide:${getClientIp(req)}`, { windowMs: 60_000, max: 30 });
  if (rl) return rl;

  const { id } = params instanceof Promise ? await params : params;

  let body: { action?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { action, note } = body;

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ ok: false, error: "action은 approve 또는 reject여야 합니다." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, membershipStatus: true, nickname: true, age: true },
  });

  if (!target) {
    return NextResponse.json({ ok: false, error: "유저를 찾을 수 없습니다." }, { status: 404 });
  }

  if (target.membershipStatus !== "pending") {
    return NextResponse.json(
      { ok: false, error: "대기 중인 가입 신청이 아닙니다." },
      { status: 409 },
    );
  }

  await prisma.user.update({
    where: { id },
    data: {
      membershipStatus: action === "approve" ? "approved" : "rejected",
      membershipDecidedAt: new Date(),
      membershipNote: action === "reject" && note?.trim() ? note.trim() : null,
      // 승인 시점 나이를 불변 스냅샷으로 고정 — 이후 닉네임 집단/나이 검증의 기준.
      ...(action === "approve" ? { approvedAge: target.age } : {}),
    },
  });

  // 본인에게 결과 알림 — 실패해도 승인/거절 처리는 유효(best-effort).
  try {
    await createMembershipNotification(id, action, note);
  } catch (e) {
    console.error("[membership-notify] 알림 생성 실패:", e);
  }

  console.log(
    `[membership-${action}] actor=${user!.dbUserId}(${user!.role}) target=${id}(${target.nickname ?? "no-nickname"})`,
  );

  return NextResponse.json({ ok: true, id, action });
}
