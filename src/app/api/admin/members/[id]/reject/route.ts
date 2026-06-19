import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasAdminAreaAccess } from "@/lib/manageAuth";
import { getAuthUser } from "@/lib/auth";
import { createMembershipNotification } from "@/lib/notifications";
import { rateLimitResponse, getClientIp } from "@/lib/rateLimit";
import { recordAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> | { id: string } };

/**
 * POST /api/admin/members/[id]/reject
 * 가입 거절 — body.reason(선택)이 신청자에게 표시된다. 재신청 가능.
 */
export async function POST(req: NextRequest, { params }: Params) {
  if (!(await hasAdminAreaAccess("staff"))) {
    return NextResponse.json({ ok: false, error: "NOT_ADMIN" }, { status: 401 });
  }

  const rl = rateLimitResponse(`admin-mutate:${getClientIp(req)}`, { windowMs: 60_000, max: 30 });
  if (rl) return rl;

  const { id } = params instanceof Promise ? await params : params;

  let reason: string | null = null;
  try {
    const body = await req.json();
    if (typeof body?.reason === "string") reason = body.reason.trim().slice(0, 200) || null;
  } catch {
    /* body 없이도 허용 */
  }

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) {
    return NextResponse.json({ ok: false, error: "찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.user.update({
    where: { id },
    data: {
      membershipStatus: "rejected",
      membershipDecidedAt: new Date(),
      membershipNote: reason,
    },
  });

  // 본인에게 결과 알림 — 실패해도 거절 처리는 유효(best-effort).
  try {
    await createMembershipNotification(id, "reject", reason);
  } catch (e) {
    console.error("[membership-notify] 알림 생성 실패:", e);
  }

  // 감사 로그 — best-effort.
  try {
    await recordAudit({
      actor: await getAuthUser(),
      action: "membership_reject",
      targetType: "user",
      targetId: id,
      summary: `가입 거절${reason ? `: ${reason}` : ""}`,
      ip: getClientIp(req),
    });
  } catch (e) {
    console.error("[audit] membership_reject 기록 실패:", e);
  }

  return NextResponse.json({ ok: true });
}
