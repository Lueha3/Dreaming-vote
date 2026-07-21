import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { hasAdminAreaAccess } from "@/lib/manageAuth";
import { getAuthUser } from "@/lib/auth";
import { rateLimitResponse, getClientIp } from "@/lib/rateLimit";
import { recordAudit } from "@/lib/audit";
import { HOME_FEED_TAG } from "@/lib/feed";

type Params = { params: Promise<{ id: string }> | { id: string } };

/**
 * POST /api/admin/clubs/[id]/reject
 * 동아리 반려 — 비노출 처리 (isApproved=false, isActive=false)
 * 영구 삭제가 아닌 소프트 숨김. 데이터는 보존됩니다.
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
    data: { isApproved: false, isActive: false },
  });

  // 노출 중이던 동아리를 반려했을 수도 있으니 홈 캐러셀 캐시도 즉시 무효화.
  revalidateTag(HOME_FEED_TAG, "max");

  try {
    await recordAudit({
      actor: await getAuthUser(),
      action: "club_reject",
      targetType: "club",
      targetId: id,
      summary: "동아리 반려(비노출)",
      ip: getClientIp(req),
    });
  } catch (e) {
    console.error("[audit] club_reject 기록 실패:", e);
  }

  return NextResponse.json({ ok: true });
}
