import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

/**
 * GET /api/notifications — 본인의 미읽음 알림 목록(최신순).
 * 본인 것만 조회(getAuthUser → userId 스코프). userId는 본인이라 응답에서 제외.
 */
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  const items = await prisma.notification.findMany({
    where: { userId: user.dbUserId, isRead: false },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, type: true, title: true, body: true, createdAt: true },
  });

  return NextResponse.json({ ok: true, items });
}
