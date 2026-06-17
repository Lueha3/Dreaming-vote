import { prisma } from "./db";
import { hasAtLeast } from "./roles";
import { getPrimaryArchetype } from "./bibleArchetypes";
import type { AuthUser } from "./auth";
import type { Role } from "./roles";

/** 최신 공개 리포트의 coreTraits에서 대표 인물형 label을 뽑는다. 없으면 null. */
function primaryArchetypeLabel(reports: { coreTraits: string }[]): string | null {
  if (reports.length === 0) return null;
  return getPrimaryArchetype(reports[0].coreTraits)?.label ?? null;
}

export type ClubDetailLineupMember = {
  nickname: string | null;
  avatarUrl: string | null;
  isOwner: boolean;
  role: Role | null;
  archetype: string | null;
};

export type ClubDetailData = {
  isLoggedIn: boolean;
  isOwner: boolean;
  myApplicationStatus: string | null;
  membershipStatus: string | null;
  isMember: boolean;
  club: {
    id: string;
    name: string;
    description: string;
    category: string;
    tags: string;
    maxMembers: number | null;
    viewCount: number;
    isApproved: boolean;
    isActive: boolean;
    createdAt: string; // ISO
    ownerNickname: string | null;
    ownerAvatarUrl: string | null;
    memberCount: number;
    lineup: ClubDetailLineupMember[];
    images: { url: string; caption: string; order: number }[];
  };
};

/**
 * 동아리 상세 데이터 — /api/clubs/[id] GET 읽기 로직과 동일.
 * 서버 컴포넌트(SSR 1패스)에서 사용. 조회수 증가는 호출 측(page)에서 별도 처리.
 * 미존재 또는 비개설자에게 숨김(미승인/비활성) → null 반환(상세 페이지는 not-found UI).
 */
export async function getClubDetail(
  id: string,
  user: AuthUser | null,
): Promise<ClubDetailData | null> {
  // 본인 신청 상태는 club 조회와 병렬(둘 다 id·userId만 필요).
  const [club, ownApplication] = await Promise.all([
    prisma.club.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        tags: true,
        maxMembers: true,
        viewCount: true,
        isApproved: true,
        isActive: true,
        ownerUserId: true,
        createdAt: true,
        owner: {
          select: {
            nickname: true,
            avatarUrl: true,
            role: true,
            reports: {
              where: { isPublic: true },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { coreTraits: true },
            },
          },
        },
        applications: {
          where: { status: "accepted" },
          orderBy: { createdAt: "asc" },
          select: {
            user: {
              select: {
                nickname: true,
                avatarUrl: true,
                role: true,
                reports: {
                  where: { isPublic: true },
                  orderBy: { createdAt: "desc" },
                  take: 1,
                  select: { coreTraits: true },
                },
              },
            },
          },
        },
        _count: { select: { applications: { where: { status: "accepted" } } } },
        images: { select: { url: true, caption: true, order: true }, orderBy: { order: "asc" } },
      },
    }),
    user
      ? prisma.clubApplication.findUnique({
          where: { clubId_userId: { clubId: id, userId: user.dbUserId } },
          select: { status: true },
        })
      : Promise.resolve(null),
  ]);

  if (!club) return null;

  const isOwner = !!user && user.dbUserId === club.ownerUserId;

  // 미승인/숨김 동아리는 개설자 본인에게만 보임 (라우트 GET과 동일).
  if ((!club.isApproved || !club.isActive) && !isOwner) return null;

  // 신청 상태는 비개설자에게만 의미. (병렬로 받았지만 개설자면 무시.)
  const myApplicationStatus = isOwner ? null : ownApplication?.status ?? null;

  const lineup: ClubDetailLineupMember[] = [
    {
      nickname: club.owner?.nickname ?? null,
      avatarUrl: club.owner?.avatarUrl ?? null,
      isOwner: true,
      role: (club.owner?.role ?? null) as Role | null,
      archetype: primaryArchetypeLabel(club.owner?.reports ?? []),
    },
    ...club.applications.map((a) => ({
      nickname: a.user.nickname ?? null,
      avatarUrl: a.user.avatarUrl ?? null,
      isOwner: false,
      role: (a.user.role ?? null) as Role | null,
      archetype: primaryArchetypeLabel(a.user.reports),
    })),
  ];

  return {
    isLoggedIn: !!user,
    isOwner,
    myApplicationStatus,
    // staff 이상 역할이면 membershipStatus를 "approved"로 노출(모임 공지 폼 표시용).
    membershipStatus: user
      ? hasAtLeast(user.role, "staff")
        ? "approved"
        : user.membershipStatus ?? null
      : null,
    isMember: isOwner || myApplicationStatus === "accepted",
    club: {
      id: club.id,
      name: club.name,
      description: club.description,
      category: club.category,
      tags: club.tags,
      maxMembers: club.maxMembers,
      viewCount: club.viewCount,
      isApproved: club.isApproved,
      isActive: club.isActive,
      createdAt: club.createdAt.toISOString(),
      ownerNickname: club.owner?.nickname ?? null,
      ownerAvatarUrl: club.owner?.avatarUrl ?? null,
      memberCount: club._count.applications,
      lineup,
      images: club.images,
    },
  };
}
