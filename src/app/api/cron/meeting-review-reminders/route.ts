import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { createNotifications } from "@/lib/notifications";

// 매 호출마다 최신 데이터로 동작해야 하므로 정적 최적화 비활성.
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/meeting-review-reminders — Vercel Cron이 매일 08:00 KST에 호출.
 * "어제"(KST 기준) 열린 모임 중 아직 미발송(reviewReminderSentAt=null)인 것을 찾아,
 * "가요(going)" RSVP였던 멤버에게 후기 작성 독려 알림을 보내고 플래그를 찍어 중복 발송을 막는다.
 *
 * 보안: CRON_SECRET이 설정돼 있으면 Vercel이 Authorization: Bearer <secret>를 붙인다.
 * fail-closed — CRON_SECRET 미설정이거나 불일치면 거부(공개 트리거 차단).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  // KST 기준 "어제" 하루 구간을 UTC로 환산.
  const kstTodayStartUtc = new Date(
    Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate()) - 9 * 60 * 60 * 1000,
  );
  const yesterdayStart = new Date(kstTodayStartUtc.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayEnd = kstTodayStartUtc;

  const meetings = await prisma.clubMeeting.findMany({
    where: {
      meetsAt: { gte: yesterdayStart, lt: yesterdayEnd },
      reviewReminderSentAt: null,
    },
    orderBy: { meetsAt: "asc" },
    take: 200,
    select: {
      id: true,
      clubId: true,
      title: true,
      club: { select: { name: true } },
    },
  });

  let notified = 0;
  for (const m of meetings) {
    try {
      // 발송 '전에' 원자적 클레임(compare-and-swap) — meeting-reminders와 동일 패턴.
      const claimed = await prisma.clubMeeting.updateMany({
        where: { id: m.id, reviewReminderSentAt: null },
        data: { reviewReminderSentAt: new Date() },
      });
      if (claimed.count === 0) continue;

      const going = await prisma.clubMeetingRsvp.findMany({
        where: { meetingId: m.id, status: "going" },
        select: { userId: true },
      });
      if (going.length > 0) {
        await createNotifications(
          going.map((g) => g.userId),
          {
            type: "club_meeting_review_reminder",
            title: "어제 모임 어떠셨나요?",
            body: `'${m.club.name}' · '${m.title}' 모임 후기를 작성해보세요!`,
            link: `/clubs/${m.clubId}/meetings/${m.id}#reviews`,
          },
        );
        notified += going.length;
      }
    } catch {
      // 한 모임 처리 실패가 나머지를 막지 않게 한다.
    }
  }

  return NextResponse.json({ ok: true, meetings: meetings.length, notified });
}
