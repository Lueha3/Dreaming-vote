import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthUser, membershipGate } from "@/lib/auth";

/**
 * GET /api/feed — 로그인 승인 멤버용 '오늘의 청년부' 활동 피드.
 * 내 동아리 다가오는 모임 + 최근 개설 동아리 + 광장 최신 글 + 응답된 기도.
 * 홈(/)은 정적으로 유지하고, 이 데이터는 클라 HomeFeed가 쿠키 확인 후 페치한다.
 */
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }
  const gate = membershipGate(user);
  if (gate) return gate; // 미승인은 membership_required(403) → 클라가 피드를 렌더하지 않음

  const me = user.dbUserId;
  const now = new Date();

  // 내 동아리 id(소유 + accepted 멤버)
  const [owned, memberApps] = await Promise.all([
    prisma.club.findMany({ where: { ownerUserId: me, isActive: true }, select: { id: true } }),
    prisma.clubApplication.findMany({
      where: { userId: me, status: "accepted" },
      select: { clubId: true },
    }),
  ]);
  const myClubIds = [...new Set([...owned.map((c) => c.id), ...memberApps.map((a) => a.clubId)])];

  const [upcomingMeetings, recentClubs, recentPosts, answeredPrayers, reportCount] = await Promise.all([
    myClubIds.length
      ? prisma.clubMeeting.findMany({
          where: { clubId: { in: myClubIds }, meetsAt: { gte: now } },
          orderBy: { meetsAt: "asc" },
          take: 3,
          select: {
            id: true,
            clubId: true,
            title: true,
            meetsAt: true,
            place: true,
            club: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
    prisma.club.findMany({
      where: { isApproved: true, isActive: true },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        name: true,
        category: true,
        _count: { select: { applications: { where: { status: "accepted" } } } },
      },
    }),
    prisma.prayer.findMany({
      // clubId: null — 정식 광장 목록(/api/prayers)과 동일하게 레거시 동아리 기도(clubId!=null) 제외.
      where: { clubId: null },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        category: true,
        content: true,
        isAnonymous: true,
        createdAt: true,
        user: { select: { nickname: true } },
        _count: { select: { intercessions: true, comments: true } },
      },
    }),
    prisma.prayer.findMany({
      where: { isAnswered: true, clubId: null },
      orderBy: { answeredAt: "desc" },
      take: 2,
      select: { id: true, category: true, content: true, answeredNote: true, answeredAt: true },
    }),
    // 승인 직후 홈에서 '성향 카드 만들기' 유도 CTA를 띄우기 위한 플래그(0/1).
    // Report.userId는 비유니크지만 생성 API가 deleteMany→create로 1장만 유지하므로 count>0로 충분.
    prisma.report.count({ where: { userId: me } }),
  ]);

  return NextResponse.json({
    ok: true,
    hasPersonalityReport: reportCount > 0,
    upcomingMeetings: upcomingMeetings.map((m) => ({
      id: m.id,
      clubId: m.clubId,
      clubName: m.club.name,
      title: m.title,
      meetsAt: m.meetsAt,
      place: m.place,
    })),
    recentClubs: recentClubs.map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      memberCount: c._count.applications,
    })),
    recentPosts: recentPosts.map((p) => ({
      id: p.id,
      category: p.category,
      snippet: p.content.slice(0, 60),
      authorName: p.isAnonymous ? "익명" : p.user?.nickname ?? "탈퇴한 멤버",
      createdAt: p.createdAt,
      reactionCount: p._count.intercessions,
      commentCount: p._count.comments,
    })),
    answeredPrayers: answeredPrayers.map((p) => ({
      id: p.id,
      category: p.category,
      snippet: p.content.slice(0, 50),
      answeredNote: p.answeredNote,
      createdAt: p.answeredAt ?? null,
    })),
  });
}
