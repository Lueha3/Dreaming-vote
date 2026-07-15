import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

/**
 * PATCH /api/notifications/read — 알림 읽음 처리.
 * body.ids 배열이 있으면 해당 알림만, body.prefixes 배열이 있으면 link가 그 접두어로
 * 시작하는 알림만(하단 탭바가 탭 진입 시 해당 카테고리 배지를 지우는 용도), 아무것도
 * 없으면 본인의 미읽음 전체를 읽음 처리. userId 스코프를 함께 걸어 남의 알림은 절대 건드릴 수 없다.
 */
export async function PATCH(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  let ids: string[] | undefined;
  let prefixes: string[] | undefined;
  try {
    const body = await req.json();
    if (Array.isArray(body?.ids)) {
      ids = body.ids.filter((x: unknown): x is string => typeof x === "string");
    }
    if (Array.isArray(body?.prefixes)) {
      prefixes = body.prefixes.filter((x: unknown): x is string => typeof x === "string");
    }
  } catch {
    /* body 없이 호출하면 전체 읽음 처리 */
  }

  await prisma.notification.updateMany({
    where: {
      userId: user.dbUserId,
      isRead: false,
      ...(ids && ids.length > 0 ? { id: { in: ids } } : {}),
      ...(prefixes && prefixes.length > 0
        ? { OR: prefixes.map((prefix) => ({ link: { startsWith: prefix } })) }
        : {}),
    },
    data: { isRead: true },
  });

  return NextResponse.json({ ok: true });
}
