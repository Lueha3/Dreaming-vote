import webpush from "web-push";
import { prisma } from "@/lib/db";

// VAPID 키가 없으면(로컬 개발 등) 조용히 비활성화 — 인앱 알림은 그대로 동작.
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const configured = !!VAPID_PUBLIC_KEY && !!VAPID_PRIVATE_KEY;

if (configured) {
  webpush.setVapidDetails(
    "mailto:admin@dreaming-vote.app",
    VAPID_PUBLIC_KEY!,
    VAPID_PRIVATE_KEY!,
  );
}

type PushPayload = {
  title: string;
  body?: string | null;
  link?: string | null;
};

/**
 * 한 유저의 등록된 모든 기기(PushSubscription)에 웹 푸시 발송.
 * best-effort — 개별 기기 발송 실패는 무시하고 계속 진행, 예외를 던지지 않는다.
 * 구독이 만료된 기기(404/410 응답)는 자동으로 정리한다.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!configured) return;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  await sendToSubscriptions(subs, payload);
}

/** 여러 유저에게 동일 푸시 발송 (동일 payload, 대상만 다름). */
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (!configured || userIds.length === 0) return;
  const subs = await prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } });
  await sendToSubscriptions(subs, payload);
}

async function sendToSubscriptions(
  subs: { id: string; endpoint: string; p256dh: string; auth: string }[],
  payload: PushPayload,
): Promise<void> {
  if (subs.length === 0) return;
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body ?? undefined,
    link: payload.link ?? "/",
  });

  const staleIds: string[] = [];
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        );
      } catch (e) {
        const statusCode = (e as { statusCode?: number } | null)?.statusCode;
        if (statusCode === 404 || statusCode === 410) staleIds.push(sub.id);
      }
    }),
  );

  if (staleIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: staleIds } } }).catch(() => {});
  }
}
