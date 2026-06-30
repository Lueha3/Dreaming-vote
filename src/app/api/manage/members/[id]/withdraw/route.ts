import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, roleGate } from "@/lib/auth";
import { canForceWithdraw, type Role } from "@/lib/roles";
import { rateLimitResponse, getClientIp } from "@/lib/rateLimit";
import { recordAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> | { id: string } };

/**
 * POST /api/manage/members/[id]/withdraw
 * 운영진 이상이 대상 멤버를 강제 탈퇴 — canForceWithdraw로 등급 역전 행사 차단.
 * 익명화·소프트 삭제 로직은 /api/my/withdraw(본인 탈퇴)와 동일하게 공유한다.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const actor = await getAuthUser();
  const gate = roleGate(actor, "staff");
  if (gate) return gate;

  const rl = rateLimitResponse(`force-withdraw:${getClientIp(req)}`, {
    windowMs: 60_000,
    max: 10,
  });
  if (rl) return rl;

  const { id } = params instanceof Promise ? await params : params;

  // 본인은 강제 탈퇴 대상에서 제외(이 경로로 자가 탈퇴 차단 — 본인 탈퇴는 /api/my/withdraw 사용)
  if (id === actor!.dbUserId) {
    return NextResponse.json(
      { ok: false, error: "본인은 이 기능으로 탈퇴할 수 없습니다." },
      { status: 400 },
    );
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, nickname: true, deletedAt: true },
  });
  if (!target) {
    return NextResponse.json({ ok: false, error: "대상을 찾을 수 없습니다." }, { status: 404 });
  }
  if (target.deletedAt) {
    return NextResponse.json({ ok: false, error: "이미 탈퇴한 회원입니다." }, { status: 400 });
  }

  if (!canForceWithdraw(actor!.role, target.role as Role)) {
    return NextResponse.json(
      { ok: false, error: "이 멤버를 탈퇴시킬 권한이 없습니다." },
      { status: 403 },
    );
  }

  // PII 익명화 + 소프트 탈퇴 (/api/my/withdraw와 동일 로직).
  // role도 반드시 "member"로 리셋 — 탈퇴 쿨다운이 없어진 이상(즉시 재로그인 가능),
  // role을 안 지우면 강제 탈퇴당한 staff/admin이 곧바로 재로그인해 권한을 그대로 되찾는다.
  await prisma.user.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      membershipStatus: "none",
      role: "member",
      nickname: null,
      avatarUrl: null,
      realName: null,
      age: null,
      gender: null,
      dreamGroup: null,
      phone: null,
      membershipAppliedAt: null,
      membershipDecidedAt: null,
      membershipNote: null,
    },
  });

  // 소유 동아리 비공개 처리 (탈퇴자 동아리 자동 숨김)
  await prisma.club.updateMany({
    where: { ownerUserId: id },
    data: { isActive: false },
  });

  // 감사 로그 — best-effort(실패해도 탈퇴 처리는 유효).
  try {
    await recordAudit({
      actor,
      action: "membership_force_withdraw",
      targetType: "user",
      targetId: id,
      summary: `강제 탈퇴: ${target.nickname ?? "no-nickname"} (${target.role})`,
      ip: getClientIp(req),
    });
  } catch (e) {
    console.error("[audit] membership_force_withdraw 기록 실패:", e);
  }

  return NextResponse.json({ ok: true });
}
