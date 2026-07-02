import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

const subscribeSchema = z.object({
  endpoint: z.string().trim().min(1).max(500),
  keys: z.object({
    p256dh: z.string().trim().min(1),
    auth: z.string().trim().min(1),
  }),
});

/**
 * POST /api/push/subscribe
 * 브라우저 PushSubscription 등록(로그인 필요). endpoint가 유니크 키라
 * 동일 기기가 다시 구독해도(혹은 다른 계정으로 로그인해도) upsert로 갱신된다.
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "잘못된 구독 정보입니다." }, { status: 400 });
  }

  const { endpoint, keys } = parsed.data;
  const userAgent = req.headers.get("user-agent")?.slice(0, 300) ?? null;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId: user.dbUserId, p256dh: keys.p256dh, auth: keys.auth, userAgent },
    create: { userId: user.dbUserId, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent },
  });

  return NextResponse.json({ ok: true });
}

const unsubscribeSchema = z.object({
  endpoint: z.string().trim().min(1).max(500),
});

/** DELETE /api/push/subscribe — 알림 끄기(기기 구독 해제). */
export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = unsubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  // 본인 소유 구독만 삭제(다른 유저 endpoint 지정 삭제 방지).
  await prisma.pushSubscription.deleteMany({
    where: { endpoint: parsed.data.endpoint, userId: user.dbUserId },
  });

  return NextResponse.json({ ok: true });
}
