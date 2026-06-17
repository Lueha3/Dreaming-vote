import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

/**
 * GET /api/membership
 * 내 가입신청 상태 + 제출했던 정보 (본인만 조회)
 */
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  // 동아리장 배지는 전역 role이 아니라 "활성 동아리를 소유 중인가"로 파생한다.
  const [me, ownedActiveClubs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.dbUserId },
      select: {
        membershipStatus: true,
        nickname: true,
        realName: true,
        age: true,
        gender: true,
        dreamGroup: true,
        phone: true,
        membershipAppliedAt: true,
        membershipNote: true,
      },
    }),
    prisma.club.count({ where: { ownerUserId: user.dbUserId, isActive: true } }),
  ]);

  if (!me) {
    return NextResponse.json({ ok: false, error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    // role은 getAuthUser의 유효값(superadmin 부트스트랩 반영). isClubLeader는 소유 활성 동아리 유무.
    membership: { ...me, role: user.role, isClubLeader: ownedActiveClubs > 0 },
  });
}
