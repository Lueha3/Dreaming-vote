import { prisma } from "@/lib/db";

type RetentionRow = { cohort: bigint; active: bigint };
type CrossCellRow = { total: bigint; cross: bigint };
type ActiveRow = { count: bigint };
type ClubJoinRow = { total: bigint; joined: bigint };

/**
 * 주간 운영 지표 계산 — 전부 기존 테이블에서 파생(별도 이벤트 로그 없음).
 * weekStart(포함)~weekEnd(배제) 구간의 상호작용을 그 주의 스냅샷으로 본다.
 * 새가족 잔존율·동아리 참여율은 "지금 시점" 기준 점 스냅샷(코호트 성격상 주 단위로 급변하지 않음).
 */
export async function computeWeeklyMetrics(weekStart: Date, weekEnd: Date) {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // 새가족 90일 잔존율 — 승인 90일 경과 멤버 중 최근 30일 내 활동(글·댓글·공감·RSVP) 있는 비율.
  const [retention] = await prisma.$queryRaw<RetentionRow[]>`
    SELECT
      COUNT(*) AS cohort,
      COUNT(*) FILTER (
        WHERE EXISTS (SELECT 1 FROM "Prayer" p WHERE p."userId" = u.id AND p."createdAt" >= ${thirtyDaysAgo})
           OR EXISTS (SELECT 1 FROM "PrayerComment" pc WHERE pc."userId" = u.id AND pc."createdAt" >= ${thirtyDaysAgo})
           OR EXISTS (SELECT 1 FROM "PrayerIntercession" pi WHERE pi."userId" = u.id AND pi."createdAt" >= ${thirtyDaysAgo})
           OR EXISTS (SELECT 1 FROM "ClubMeetingRsvp" r WHERE r."userId" = u.id AND r."createdAt" >= ${thirtyDaysAgo})
      ) AS active
    FROM "User" u
    WHERE u."membershipStatus" = 'approved'
      AND u."deletedAt" IS NULL
      AND u."membershipDecidedAt" <= ${ninetyDaysAgo}
  `;
  const cohortCount = Number(retention.cohort);
  const newcomer90dRetention = cohortCount > 0 ? Number(retention.active) / cohortCount : 0;

  // 크로스-꿈터 교류율 — 이번 주 댓글·공감 중 작성자·반응자의 dreamGroup이 다른 비율.
  const [crossCell] = await prisma.$queryRaw<CrossCellRow[]>`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE au."dreamGroup" IS DISTINCT FROM ru."dreamGroup") AS cross
    FROM (
      SELECT pc."userId" AS reactor_id, p."userId" AS author_id
      FROM "PrayerComment" pc JOIN "Prayer" p ON p.id = pc."prayerId"
      WHERE pc."createdAt" >= ${weekStart} AND pc."createdAt" < ${weekEnd}
      UNION ALL
      SELECT pi."userId" AS reactor_id, p."userId" AS author_id
      FROM "PrayerIntercession" pi JOIN "Prayer" p ON p.id = pi."prayerId"
      WHERE pi."createdAt" >= ${weekStart} AND pi."createdAt" < ${weekEnd}
    ) interactions
    JOIN "User" ru ON ru.id = interactions.reactor_id
    JOIN "User" au ON au.id = interactions.author_id
  `;
  const crossCellTotal = Number(crossCell.total);
  const crossCellInteractionRate = crossCellTotal > 0 ? Number(crossCell.cross) / crossCellTotal : 0;

  // 동아리 참여율 — 현재 승인 멤버 중 accepted 동아리 1개 이상 비율.
  const [clubJoin] = await prisma.$queryRaw<ClubJoinRow[]>`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (
        WHERE EXISTS (SELECT 1 FROM "ClubApplication" ca WHERE ca."userId" = u.id AND ca.status = 'accepted')
      ) AS joined
    FROM "User" u
    WHERE u."membershipStatus" = 'approved' AND u."deletedAt" IS NULL
  `;
  const clubJoinTotal = Number(clubJoin.total);
  const clubJoinRate = clubJoinTotal > 0 ? Number(clubJoin.joined) / clubJoinTotal : 0;

  // 그 주 활동(글·댓글·공감·RSVP)이 있었던 승인 멤버 수(중복 제거).
  const [active] = await prisma.$queryRaw<ActiveRow[]>`
    SELECT COUNT(DISTINCT t.uid) AS count
    FROM (
      SELECT "userId" AS uid FROM "Prayer" WHERE "createdAt" >= ${weekStart} AND "createdAt" < ${weekEnd}
      UNION
      SELECT "userId" FROM "PrayerComment" WHERE "createdAt" >= ${weekStart} AND "createdAt" < ${weekEnd}
      UNION
      SELECT "userId" FROM "PrayerIntercession" WHERE "createdAt" >= ${weekStart} AND "createdAt" < ${weekEnd}
      UNION
      SELECT "userId" FROM "ClubMeetingRsvp" WHERE "createdAt" >= ${weekStart} AND "createdAt" < ${weekEnd}
    ) t
    JOIN "User" u ON u.id = t.uid
    WHERE u."membershipStatus" = 'approved' AND u."deletedAt" IS NULL
  `;
  const activeMemberCount = Number(active.count);

  return { newcomer90dRetention, crossCellInteractionRate, clubJoinRate, activeMemberCount };
}
