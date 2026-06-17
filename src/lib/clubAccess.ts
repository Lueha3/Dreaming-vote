import { prisma } from "./db";

export type ClubMembership = {
  club: { id: string; ownerUserId: string } | null;
  isOwner: boolean;
  isMember: boolean;
};

/**
 * 이 동아리의 멤버(개설자 or accepted 신청자)인지 판정.
 * 모임·후기·갤러리 등 멤버 전용 리소스 접근 게이팅에 사용.
 */
export async function getClubMembership(
  clubId: string,
  dbUserId: string | null,
): Promise<ClubMembership> {
  const found = await prisma.club.findUnique({
    where: { id: clubId },
    select: { id: true, ownerUserId: true, isApproved: true, isActive: true },
  });
  if (!found) return { club: null, isOwner: false, isMember: false };

  const club = { id: found.id, ownerUserId: found.ownerUserId };
  if (!dbUserId) return { club, isOwner: false, isMember: false };

  const isOwner = club.ownerUserId === dbUserId;
  // 개설자는 미승인/숨김 상태여도 접근(상세 페이지 GET /api/clubs/[id]와 동일 규칙).
  if (isOwner) return { club, isOwner: true, isMember: true };

  // 비개설자는 동아리가 공개(승인+활성) 상태일 때만 멤버로 인정 — 숨김 처리 시 멤버 활동도 차단.
  if (!found.isApproved || !found.isActive) {
    return { club, isOwner: false, isMember: false };
  }

  const app = await prisma.clubApplication.findUnique({
    where: { clubId_userId: { clubId, userId: dbUserId } },
    select: { status: true },
  });
  return { club, isOwner: false, isMember: app?.status === "accepted" };
}
