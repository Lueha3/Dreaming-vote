import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { getPrimaryArchetype } from "@/lib/bibleArchetypes";

/** 최신 공개 리포트의 coreTraits에서 대표 인물형 label을 뽑는다. 없으면 null. */
function primaryArchetypeLabel(reports: { coreTraits: string }[]): string | null {
  if (reports.length === 0) return null;
  return getPrimaryArchetype(reports[0].coreTraits)?.label ?? null;
}

type Params = { params: Promise<{ id: string }> | { id: string } };

/**
 * GET /api/clubs/[id]
 * 동아리 상세 (공개) — 승인+활성 동아리만 노출.
 * 단, 개설자 본인은 승인 전/숨김 상태여도 조회 가능.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = params instanceof Promise ? await params : params;

  const club = await prisma.club.findUnique({
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
  });

  if (!club) {
    return NextResponse.json({ ok: false, error: "동아리를 찾을 수 없습니다." }, { status: 404 });
  }

  const user = await getAuthUser();
  const isOwner = !!user && user.dbUserId === club.ownerUserId;

  // 미승인/숨김 동아리는 개설자 본인에게만 보임
  if ((!club.isApproved || !club.isActive) && !isOwner) {
    return NextResponse.json({ ok: false, error: "동아리를 찾을 수 없습니다." }, { status: 404 });
  }

  // 조회수 증가 (개설자 본인 조회는 제외) — 실패해도 무시
  if (!isOwner) {
    prisma.club
      .update({ where: { id }, data: { viewCount: { increment: 1 } } })
      .catch(() => {});
  }

  // 로그인한 비개설자의 신청 상태 조회
  let myApplicationStatus: string | null = null;
  if (user && !isOwner) {
    const app = await prisma.clubApplication.findUnique({
      where: { clubId_userId: { clubId: id, userId: user.dbUserId } },
      select: { status: true },
    });
    myApplicationStatus = app?.status ?? null;
  }

  // 라인업 — 개설자(👑) + accepted 멤버, 각자 대표 인물형 1개
  const lineup = [
    {
      nickname: club.owner?.nickname ?? null,
      avatarUrl: club.owner?.avatarUrl ?? null,
      isOwner: true,
      archetype: primaryArchetypeLabel(club.owner?.reports ?? []),
    },
    ...club.applications.map((a) => ({
      nickname: a.user.nickname ?? null,
      avatarUrl: a.user.avatarUrl ?? null,
      isOwner: false,
      archetype: primaryArchetypeLabel(a.user.reports),
    })),
  ];

  return NextResponse.json({
    ok: true,
    isLoggedIn: !!user,
    isOwner,
    myApplicationStatus,
    membershipStatus: user?.membershipStatus ?? null,
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
      createdAt: club.createdAt,
      ownerNickname: club.owner?.nickname ?? null,
      ownerAvatarUrl: club.owner?.avatarUrl ?? null,
      memberCount: club._count.applications,
      lineup,
      images: club.images,
    },
  });
}
