import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { NOTIFICATION_TAB_LINK_PREFIXES, type NotificationTabKey } from "@/lib/notificationTabs";

/**
 * GET /api/notifications/tab-counts — 하단 탭바 배지용, 탭별 미읽음 알림 수.
 * 본인 미읽음 알림의 link 접두어를 NOTIFICATION_TAB_LINK_PREFIXES로 분류해 집계한다.
 * 개수만 필요하므로 link 컬럼만 select — 목록 전체를 내려주지 않는다.
 */
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  const unread = await prisma.notification.findMany({
    where: { userId: user.dbUserId, isRead: false },
    select: { link: true },
  });

  const counts = Object.fromEntries(
    Object.keys(NOTIFICATION_TAB_LINK_PREFIXES).map((tab) => [tab, 0]),
  ) as Record<NotificationTabKey, number>;

  for (const { link } of unread) {
    if (!link) continue;
    for (const [tab, prefixes] of Object.entries(NOTIFICATION_TAB_LINK_PREFIXES) as [
      NotificationTabKey,
      readonly string[],
    ][]) {
      if (prefixes.some((prefix) => link.startsWith(prefix))) {
        counts[tab]++;
        break;
      }
    }
  }

  return NextResponse.json({ ok: true, counts });
}
