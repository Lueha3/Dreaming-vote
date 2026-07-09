import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/db";
import { getWeekMonday } from "@/lib/week";

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
    avatarUrl: string | null;
    systemType: string | null; // welcome | birthday — 홈에서 골드 톤으로 구분 표시
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
  // 이번 주 아이스브레이커 질문 — 홈 최상단 브리핑 카드의 주인공(없으면 null).
  prompt: { id: string; question: string; answerCount: number } | null;
};

type GlobalFeed = Pick<FeedData, "recentClubs" | "recentPosts" | "answeredPrayers" | "prompt">;

/** 홈 피드의 전역 캐시 태그 — 새 동아리/광장글/응답기도 반영 시 revalidateTag로 즉시 무효화 가능. */
export const HOME_FEED_TAG = "home-feed";

/**
 * 전역(모든 유저 공통) 피드 — 최근 개설 동아리 + 광장 최신 글 + 응답된 기도.
 * 내용이 유저와 무관하게 동일하므로 unstable_cache로 ~60초 묶어, 매 요청·매 유저가
 * DB를 치는 대신 윈도우당 1회만 조회한다(콜드/원격 왕복 비용을 대다수 로드에서 제거).
 */
const getGlobalFeed = unstable_cache(
  async (): Promise<GlobalFeed> => {
    const [recentClubsRaw, recentPostsRaw, answeredPrayersRaw, promptRaw] = await Promise.all([
      prisma.club.findMany({
        // isSystem 제외 — 전체 행사 보드는 '새로 생긴 동아리'가 아니다.
        where: { isApproved: true, isActive: true, isSystem: false },
        orderBy: { createdAt: "desc" },
        take: 4,
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
          systemType: true,
          createdAt: true,
          user: { select: { nickname: true, avatarUrl: true } },
          _count: { select: { intercessions: true, comments: true } },
        },
      }),
      prisma.prayer.findMany({
        where: { isAnswered: true, clubId: null },
        orderBy: { answeredAt: "desc" },
        take: 2,
        select: { id: true, category: true, content: true, answeredNote: true, answeredAt: true },
      }),
      prisma.icebreakerPrompt.findUnique({
        where: { weekOf: getWeekMonday(new Date()) },
        select: { id: true, question: true, _count: { select: { answers: true } } },
      }),
    ]);

    return {
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
        avatarUrl: p.isAnonymous ? null : p.user?.avatarUrl ?? null,
        systemType: p.systemType,
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
      prompt: promptRaw
        ? { id: promptRaw.id, question: promptRaw.question, answerCount: promptRaw._count.answers }
        : null,
    };
  },
  ["home-global-feed"],
  { revalidate: 60, tags: [HOME_FEED_TAG] },
);

export async function getFeedData(dbUserId: string): Promise<FeedData> {
  const me = dbUserId;
  const now = new Date();

  // 내 동아리 id(소유 + accepted 멤버) + 전역 피드(대개 캐시 히트)를 한 배치로 병렬.
  const [owned, memberApps, global, reportCount] = await Promise.all([
    prisma.club.findMany({ where: { ownerUserId: me, isActive: true }, select: { id: true } }),
    prisma.clubApplication.findMany({
      where: { userId: me, status: "accepted" },
      select: { clubId: true },
    }),
    getGlobalFeed(),
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
    ...global,
  };
}
