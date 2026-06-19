import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasAdminAreaAccess } from "@/lib/manageAuth";
import { getAuthUser } from "@/lib/auth";
import { rateLimitResponse, getClientIp } from "@/lib/rateLimit";
import { recordAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> | { id: string } };

/**
 * POST /api/admin/clubs/[id]/approve
 * 동아리 승인 — 노출 시작 (isApproved=true, isActive=true)
 */
export async function POST(req: NextRequest, { params }: Params) {
  if (!(await hasAdminAreaAccess("staff"))) {
    return NextResponse.json({ ok: false, error: "NOT_ADMIN" }, { status: 401 });
  }

  const rl = rateLimitResponse(`admin-mutate:${getClientIp(req)}`, { windowMs: 60_000, max: 30 });
  if (rl) return rl;

  const { id } = params instanceof Promise ? await params : params;

  const club = await prisma.club.findUnique({ where: { id }, select: { id: true } });
  if (!club) return NextResponse.json({ ok: false, error: "찾을 수 없습니다." }, { status: 404 });

  await prisma.club.update({
    where: { id },
    data: { isApproved: true, isActive: true },
  });

  try {
    await recordAudit({
      actor: await getAuthUser(),
      action: "club_approve",
      targetType: "club",
      targetId: id,
      summary: "동아리 승인",
      ip: getClientIp(req),
    });
  } catch (e) {
    console.error("[audit] club_approve 기록 실패:", e);
  }

  return NextResponse.json({ ok: true });
}
