import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { createNotifications } from "@/lib/notifications";
import { computeWeeklyMetrics } from "@/lib/metrics";
import { getWeekMonday } from "@/lib/week";
import { getMonthStart } from "@/lib/month";
import { ICEBREAKER_PRESETS } from "@/lib/icebreakerPresets";
import { createBirthdayCard } from "@/lib/birthdayCard";
import { computeMonthlyRecap } from "@/lib/monthlyRecap";

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

  // 이번 주 아이스브레이커 질문 자동 채우기 — 운영진이 안 정했으면 월요일에 프리셋 순환 배정.
  let icebreakerPrompt: { weekOf: string; question: string } | null = null;
  if (kstNow.getUTCDay() === 1) {
    try {
      const weekOf = getWeekMonday(now);
      const existing = await prisma.icebreakerPrompt.findUnique({ where: { weekOf }, select: { id: true } });
      if (!existing) {
        const totalPrompts = await prisma.icebreakerPrompt.count();
        const question = ICEBREAKER_PRESETS[totalPrompts % ICEBREAKER_PRESETS.length];
        const created = await prisma.icebreakerPrompt.create({
          data: { weekOf, question, createdById: null },
          select: { weekOf: true, question: true },
        });
        icebreakerPrompt = { weekOf: created.weekOf.toISOString(), question: created.question };
      }
    } catch (e) {
      console.error("[icebreaker] 자동 질문 배정 실패:", e);
    }
  }

  // 생일 축하 카드 — 오늘(KST)이 생일인 승인 멤버에게 자동 게시. 같은 날 중복 게시 방지.
  let birthdaysPosted = 0;
  try {
    const todayMonth = kstNow.getUTCMonth() + 1;
    const todayDay = kstNow.getUTCDate();
    const birthdayUsers = await prisma.user.findMany({
      where: {
        membershipStatus: "approved",
        deletedAt: null,
        birthMonth: todayMonth,
        birthDay: todayDay,
      },
      select: { id: true, nickname: true },
    });
    const kstDayStart = new Date(
      Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate()) - 9 * 60 * 60 * 1000,
    );
    for (const u of birthdayUsers) {
      try {
        const already = await prisma.prayer.findFirst({
          where: { userId: u.id, systemType: "birthday", createdAt: { gte: kstDayStart } },
          select: { id: true },
        });
        if (already) continue;
        await createBirthdayCard(u.id, u.nickname);
        birthdaysPosted++;
      } catch (e) {
        console.error("[birthday] 카드 게시 실패:", u.id, e);
      }
    }
  } catch (e) {
    console.error("[birthday] 생일자 조회 실패:", e);
  }

  // 월간 리캡 — 매달 1일(KST)에 지난 한 달치를 계산해 적재. 별도 cron 엔트리를 늘리지 않기 위함.
  let monthlyRecap: { monthOf: string } | null = null;
  if (kstNow.getUTCDate() === 1) {
    try {
      const thisMonthStart = getMonthStart(now);
      const lastMonthStart = new Date(
        Date.UTC(thisMonthStart.getUTCFullYear(), thisMonthStart.getUTCMonth() - 1, 1),
      );
      const recap = await computeMonthlyRecap(lastMonthStart, thisMonthStart);
      const snapshot = await prisma.monthlyRecap.upsert({
        where: { monthOf: lastMonthStart },
        update: recap,
        create: { monthOf: lastMonthStart, ...recap },
        select: { monthOf: true },
      });
      monthlyRecap = { monthOf: snapshot.monthOf.toISOString() };
    } catch (e) {
      console.error("[monthly-recap] 계산 실패:", e);
    }
  }

  return NextResponse.json({
    ok: true,
    meetings: meetings.length,
    notified,
    metricSnapshot,
    icebreakerPrompt,
    birthdaysPosted,
    monthlyRecap,
  });
}
