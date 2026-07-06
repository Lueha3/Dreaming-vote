import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

/**
 * GET /api/my/clubs
 * 내 동아리 현황 (로그인 필요)
 * - owned: 내가 개설한 동아리 (승인 상태 + 멤버/대기 신청 수)
 * - applied: 내가 가입 신청한 동아리 (내 신청 상태)
 */
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  const [ownedRaw, appliedRaw] = await Promise.all([
    prisma.club.findMany({
      where: { ownerUserId: user.dbUserId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        category: true,
        isApproved: true,
        isActive: true,
        maxMembers: true,
        viewCount: true,
        createdAt: true,
        applications: { select: { status: true } },
      },
    }),
    prisma.clubApplication.findMany({
      // 시스템 동아리(전체 행사 보드)는 자동 등록이라 '내가 신청한 동아리' 목록에선 숨긴다.
      where: { userId: user.dbUserId, club: { isSystem: false } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        createdAt: true,
        club: {
          select: {
            id: true,
            name: true,
            category: true,
            isApproved: true,
            isActive: true,
            ownerUserId: true,
          },
        },
      },
    }),
  ]);

  const owned = ownedRaw.map((c) => ({
    id: c.id,
    name: c.name,
    category: c.category,
    isApproved: c.isApproved,
    isActive: c.isActive,
    maxMembers: c.maxMembers,
    viewCount: c.viewCount,
    createdAt: c.createdAt,
    memberCount: c.applications.filter((a) => a.status === "accepted").length,
    pendingCount: c.applications.filter((a) => a.status === "pending").length,
  }));

  const applied = appliedRaw
    .filter((a) => a.club.ownerUserId !== user.dbUserId)
    .map((a) => ({
      applicationId: a.id,
      status: a.status,
      createdAt: a.createdAt,
      clubId: a.club.id,
      clubName: a.club.name,
      category: a.club.category,
      clubVisible: a.club.isApproved && a.club.isActive,
    }));

  return NextResponse.json({ ok: true, owned, applied });
}
