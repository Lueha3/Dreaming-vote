import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { createNotifications } from "@/lib/notifications";
import { computeWeeklyMetrics } from "@/lib/metrics";

// 매 호출마다 최신 데이터로 동작해야 하므로 정적 최적화 비활성.
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/meeting-reminders — Vercel Cron이 주기적으로 호출.
 * 24시간 내 예정 + 아직 미발송(reminderSentAt=null) 모임을 찾아, "가요(going)" RSVP에게
 * 리마인더 알림을 보내고 reminderSentAt를 찍어 중복 발송을 막는다.
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
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const meetings = await prisma.clubMeeting.findMany({
    where: { meetsAt: { gte: now, lte: in24h }, reminderSentAt: null },
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
      // 발송 '전에' 원자적 클레임(compare-and-swap) — 동시 실행/재시도가 겹쳐도
      // 단일 SQL UPDATE의 원자성으로 한 실행만 통과한다. count===0이면 이미 처리됨.
      const claimed = await prisma.clubMeeting.updateMany({
        where: { id: m.id, reminderSentAt: null },
        data: { reminderSentAt: new Date() },
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
            type: "club_meeting_reminder",
            title: "곧 모임이 있어요 ⏰",
            body: `'${m.club.name}' · '${m.title}' 모임이 24시간 안에 있어요.`,
            link: `/clubs/${m.clubId}/meetings/${m.id}`,
          },
        );
        notified += going.length;
      }
    } catch {
      // 한 모임 처리 실패가 나머지를 막지 않게 한다.
    }
  }

  // 주간 지표 스냅샷 — 매일 도는 이 cron에 얹어서, KST 기준 월요일에만 지난 한 주치를 계산한다.
  // (별도 cron 엔트리를 늘리지 않기 위함. 09:00 KST 실행 오차는 주간 집계엔 무의미해 무시한다.)
  let metricSnapshot: { weekOf: string } | null = null;
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  if (kstNow.getUTCDay() === 1) {
    try {
      const weekEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
      const metrics = await computeWeeklyMetrics(weekStart, weekEnd);
      const snapshot = await prisma.metricSnapshot.upsert({
        where: { weekOf: weekStart },
        update: metrics,
        create: { weekOf: weekStart, ...metrics },
        select: { weekOf: true },
      });
      metricSnapshot = { weekOf: snapshot.weekOf.toISOString() };
    } catch (e) {
      console.error("[metrics] 주간 스냅샷 계산 실패:", e);
    }
  }

  return NextResponse.json({ ok: true, meetings: meetings.length, notified, metricSnapshot });
}
