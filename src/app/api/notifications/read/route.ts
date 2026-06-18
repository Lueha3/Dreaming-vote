import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

/**
 * PATCH /api/notifications/read — 알림 읽음 처리.
 * body.ids 배열이 있으면 해당 알림만, 없으면 본인의 미읽음 전체를 읽음 처리.
 * userId 스코프를 함께 걸어 남의 알림은 절대 건드릴 수 없다.
 */
export async function PATCH(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  let ids: string[] | undefined;
  try {
    const body = await req.json();
    if (Array.isArray(body?.ids)) {
      ids = body.ids.filter((x: unknown): x is string => typeof x === "string");
    }
  } catch {
    /* body 없이 호출하면 전체 읽음 처리 */
  }

  await prisma.notification.updateMany({
    where: {
      userId: user.dbUserId,
      isRead: false,
      ...(ids && ids.length > 0 ? { id: { in: ids } } : {}),
    },
    data: { isRead: true },
  });

  return NextResponse.json({ ok: true });
}
