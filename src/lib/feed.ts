import { prisma } from "@/lib/db";

/**
 * 홈 '오늘의 청년부' 피드 데이터 — API 라우트(/api/feed)와 홈 서버 렌더(page.tsx)가 공유한다.
 * 날짜는 클라이언트가 기대하는 ISO 문자열로 직렬화해 두 경로의 응답 형태를 동일하게 맞춘다.
 *
 * 성능: 서로 의존 없는 쿼리를 한 번의 Promise.all로 묶어 순차 DB 왕복 깊이를 최소화한다.
 * (다가오는 모임만 내 동아리 id 집합에 의존하므로 그 한 갈래만 2단계로 둔다)
 */
export type FeedData = {
  hasPersonalityReport: boolean;
  upcomingMeetings: {
    id: string;
    clubId: string;
    clubName: string;
    title: string;
    meetsAt: string;
    place: string;
  }[];
  recentClubs: { id: string; name: string; category: string; memberCount: number }[];
  recentPosts: {
    id: string;
    category: string;
    snippet: string;
    authorName: string;
    createdAt: string;
    reactionCount: number;
    commentCount: number;
  }[];
  answeredPrayers: {
    id: string;
    category: string;
    snippet: string;
    answeredNote: string | null;
    createdAt: string | null;
  }[];
};

export async function getFeedData(dbUserId: string): Promise<FeedData> {
  const me = dbUserId;
  const now = new Date();

  // 내 동아리 id(소유 + accepted 멤버) + 동아리 id에 의존하지 않는 나머지 피드를 한 번에 조회.
  const [owned, memberApps, recentClubsRaw, recentPostsRaw, answeredPrayersRaw, reportCount] =
    await Promise.all([
      prisma.club.findMany({ where: { ownerUserId: me, isActive: true }, select: { id: true } }),
      prisma.clubApplication.findMany({
        where: { userId: me, status: "accepted" },
        select: { clubId: true },
      }),
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

  const myClubIds = [...new Set([...owned.map((c) => c.id), ...memberApps.map((a) => a.clubId)])];

  // 다가오는 모임만 내 동아리 id 집합에 의존 — 위 배치 이후 단독 조회.
  const upcomingMeetings = myClubIds.length
    ? await prisma.clubMeeting.findMany({
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
    : [];

  return {
    hasPersonalityReport: reportCount > 0,
    upcomingMeetings: upcomingMeetings.map((m) => ({
      id: m.id,
      clubId: m.clubId,
      clubName: m.club.name,
      title: m.title,
      meetsAt: m.meetsAt.toISOString(),
      place: m.place,
    })),
    recentClubs: recentClubsRaw.map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      memberCount: c._count.applications,
    })),
    recentPosts: recentPostsRaw.map((p) => ({
      id: p.id,
      category: p.category,
      snippet: p.content.slice(0, 60),
      authorName: p.isAnonymous ? "익명" : p.user?.nickname ?? "탈퇴한 멤버",
      createdAt: p.createdAt.toISOString(),
      reactionCount: p._count.intercessions,
      commentCount: p._count.comments,
    })),
    answeredPrayers: answeredPrayersRaw.map((p) => ({
      id: p.id,
      category: p.category,
      snippet: p.content.slice(0, 50),
      answeredNote: p.answeredNote,
      createdAt: p.answeredAt ? p.answeredAt.toISOString() : null,
    })),
  };
}
