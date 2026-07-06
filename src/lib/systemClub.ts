import { prisma } from "@/lib/db";

/**
 * 청년부 전체 행사 보드 — 시스템 동아리(Club.isSystem) 1개를 승인 멤버 전원의
 * 자동 멤버십(ClubApplication accepted)으로 취급해, 기존 모임·RSVP·리마인더·홈피드
 * '다가오는 모임' 인프라를 그대로 재사용한다. 별도 이벤트 테이블을 만들지 않는 이유.
 */
export async function getSystemClubId(): Promise<string | null> {
  const club = await prisma.club.findFirst({ where: { isSystem: true }, select: { id: true } });
  return club?.id ?? null;
}

/** 승인 시점에 호출 — 시스템 동아리가 있으면 해당 유저를 accepted 멤버로 자동 등록. best-effort. */
export async function ensureSystemClubMembership(userId: string): Promise<void> {
  const clubId = await getSystemClubId();
  if (!clubId) return;
  await prisma.clubApplication.upsert({
    where: { clubId_userId: { clubId, userId } },
    update: { status: "accepted" },
    create: { clubId, userId, status: "accepted" },
  });
}
