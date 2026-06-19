import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthUser, roleGate } from "@/lib/auth";
import { canAssignRole, type Role } from "@/lib/roles";
import { rateLimitResponse, getClientIp } from "@/lib/rateLimit";
import { recordAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> | { id: string } };

// 지정 가능한 등급만 허용 — superadmin·club_leader는 입력 자체를 거부.
const bodySchema = z.object({ role: z.enum(["member", "staff", "admin"]) });

/**
 * PATCH /api/manage/users/[id]/role
 * 대상 사용자의 전역 역할 변경 — 관리자 이상만, canAssignRole 규칙으로 권한 상승/탈취 차단.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const actor = await getAuthUser();
  const gate = roleGate(actor, "admin");
  if (gate) return gate;

  const rl = rateLimitResponse(`role-change:${getClientIp(req)}`, { windowMs: 60_000, max: 30 });
  if (rl) return rl;

  const { id } = params instanceof Promise ? await params : params;

  // 본인 역할은 변경 불가(자가 강등·잠금 방지)
  if (id === actor!.dbUserId) {
    return NextResponse.json(
      { ok: false, error: "본인 역할은 변경할 수 없습니다." },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "지정할 수 없는 역할입니다." }, { status: 400 });
  }
  const next = parsed.data.role;

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, nickname: true },
  });
  if (!target) {
    return NextResponse.json({ ok: false, error: "대상을 찾을 수 없습니다." }, { status: 404 });
  }

  if (!canAssignRole(actor!.role, target.role as Role, next)) {
    return NextResponse.json(
      { ok: false, error: "이 역할로 변경할 권한이 없습니다." },
      { status: 403 },
    );
  }

  await prisma.user.update({ where: { id }, data: { role: next } });

  // 감사 로그 — best-effort(실패해도 역할 변경은 유효).
  try {
    await recordAudit({
      actor,
      action: "role_change",
      targetType: "user",
      targetId: id,
      summary: `역할 변경: ${target.role} → ${next} (${target.nickname ?? "no-nickname"})`,
      ip: getClientIp(req),
    });
  } catch (e) {
    console.error("[audit] role_change 기록 실패:", e);
  }

  return NextResponse.json({ ok: true, id, role: next });
}
