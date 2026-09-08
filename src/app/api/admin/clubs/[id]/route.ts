import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { hasAdminAreaAccess } from "@/lib/manageAuth";
import { getAuthUser } from "@/lib/auth";
import { rateLimitResponse, getClientIp } from "@/lib/rateLimit";
import { recordAudit } from "@/lib/audit";
import { HOME_FEED_TAG } from "@/lib/feed";
import { createClient } from "@/lib/supabase/server";
import { removeStorageObjects } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> | { id: string } };

/**
 * DELETE /api/admin/clubs/[id]
 * 동아리 영구 삭제 — 신청·모임·후기·카드뉴스 등 하위 데이터가 cascade로 함께 삭제됩니다.
 * 반려(숨김)와 달리 되돌릴 수 없음.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  if (!(await hasAdminAreaAccess("staff"))) {
    return NextResponse.json({ ok: false, error: "NOT_ADMIN" }, { status: 401 });
  }

  const rl = rateLimitResponse(`admin-mutate:${getClientIp(req)}`, { windowMs: 60_000, max: 30 });
  if (rl) return rl;

  const { id } = params instanceof Promise ? await params : params;

  const club = await prisma.club.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!club) return NextResponse.json({ ok: false, error: "찾을 수 없습니다." }, { status: 404 });

  // cascade로 함께 삭제될 카드뉴스·모임 갤러리 사진의 스토리지 객체를 정리(고아 방지) — best-effort.
  const [clubImages, meetingImages] = await Promise.all([
    prisma.clubImage.findMany({ where: { clubId: id }, select: { url: true } }),
    prisma.clubMeetingImage.findMany({ where: { meeting: { clubId: id } }, select: { url: true } }),
  ]);

  await prisma.club.delete({ where: { id } });

  // 노출 중이던 동아리가 삭제됐을 수도 있으니 홈 캐러셀 캐시도 즉시 무효화.
  revalidateTag(HOME_FEED_TAG, "max");

  const urls = [...clubImages, ...meetingImages].map((im) => im.url);
  if (urls.length > 0) {
    const supabase = await createClient();
    await removeStorageObjects(supabase, "club-images", urls);
  }

  try {
    await recordAudit({
      actor: await getAuthUser(),
      action: "club_delete",
      targetType: "club",
      targetId: id,
      summary: `동아리 영구 삭제(${club.name})`,
      ip: getClientIp(req),
    });
  } catch (e) {
    console.error("[audit] club_delete 기록 실패:", e);
  }

  return NextResponse.json({ ok: true });
}
