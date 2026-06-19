import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

/**
 * GET /api/notifications — 본인 알림 목록(최신순 20건, 읽음 포함) + 미읽음 수.
 * 알림 벨이 목록·배지를 함께 그리므로 한 번에 반환. 본인 것만(userId 스코프).
 */
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.dbUserId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, type: true, title: true, body: true, link: true, isRead: true, createdAt: true },
    }),
    prisma.notification.count({ where: { userId: user.dbUserId, isRead: false } }),
  ]);

  return NextResponse.json({ ok: true, items, unreadCount });
}
