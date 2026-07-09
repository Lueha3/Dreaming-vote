import { prisma } from "@/lib/db";

/**
 * 월간 리캡 집계 — 전부 기존 테이블에서 파생(별도 이벤트 로그 없음).
 * monthStart(포함)~monthEnd(배제) 구간의 활동을 그 달의 스냅샷으로 본다.
 */
export async function computeMonthlyRecap(monthStart: Date, monthEnd: Date) {
  const [postCount, reactionCount, commentCount, newcomerCount, birthdayCount, answeredPrayerCount, topPost] =
    await Promise.all([
      prisma.prayer.count({
        where: { createdAt: { gte: monthStart, lt: monthEnd }, systemType: null },
      }),
      prisma.prayerIntercession.count({
        where: { createdAt: { gte: monthStart, lt: monthEnd } },
      }),
      prisma.prayerComment.count({
        where: { createdAt: { gte: monthStart, lt: monthEnd } },
      }),
      prisma.user.count({
        where: {
          membershipStatus: "approved",
          membershipDecidedAt: { gte: monthStart, lt: monthEnd },
        },
      }),
      prisma.prayer.count({
        where: { createdAt: { gte: monthStart, lt: monthEnd }, systemType: "birthday" },
      }),
      prisma.prayer.count({
        where: { isAnswered: true, answeredAt: { gte: monthStart, lt: monthEnd } },
      }),
      prisma.prayer.findFirst({
        where: {
          createdAt: { gte: monthStart, lt: monthEnd },
          systemType: null,
          isAnonymous: false,
        },
        orderBy: { intercessions: { _count: "desc" } },
        select: {
          id: true,
          content: true,
          user: { select: { nickname: true } },
          _count: { select: { intercessions: true } },
        },
      }),
    ]);

  const hasTopPost = !!topPost && topPost._count.intercessions > 0;

  return {
    postCount,
    reactionCount,
    commentCount,
    newcomerCount,
    birthdayCount,
    answeredPrayerCount,
    topPostId: hasTopPost ? topPost!.id : null,
    topPostSnippet: hasTopPost ? topPost!.content.slice(0, 60) : null,
    topPostAuthorName: hasTopPost ? (topPost!.user?.nickname ?? "탈퇴한 멤버") : null,
    topPostReactionCount: hasTopPost ? topPost!._count.intercessions : null,
  };
}
