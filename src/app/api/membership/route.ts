import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

/**
 * GET /api/membership
 * 내 가입신청 상태 + 제출했던 정보 (본인만 조회)
 *
 * ?fields=summary → Header 등 PII가 필요 없는 호출용.
 *   membershipStatus·nickname·role·isClubLeader 4필드만 반환(본인 PII 미전송).
 *   매 페이지 이동마다 호출되는 Header가 본인 realName·age·gender·phone을 끌고
 *   다니지 않도록 공격면을 줄인다.
 * 파라미터 없음(기본) → /join 화면용. 제출했던 realName·age·gender·phone 등 전체 반환.
 */
export async function GET(req: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  const summary = new URL(req.url).searchParams.get("fields") === "summary";

  // 동아리장 배지는 전역 role이 아니라 "활성 동아리를 소유 중인가"로 파생한다.
  if (summary) {
    // getAuthUser가 이미 membershipStatus·nickname·role을 들고 있으므로(첫 조회 1회) 추가 user 조회 없이
    // 동아리장 배지용 소유 동아리 개수만 센다 — 매 페이지 이동마다 호출되는 Header의 DB 왕복을 1회로 줄인다.
    const ownedActiveClubs = await prisma.club.count({
      where: { ownerUserId: user.dbUserId, isActive: true },
    });
    return NextResponse.json({
      ok: true,
      membership: {
        membershipStatus: user.membershipStatus,
        nickname: user.nickname,
        role: user.role,
        isClubLeader: ownedActiveClubs > 0,
      },
    });
  }

  // 전체(/join 화면) 모드 — 제출했던 PII 포함 전체 반환.
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
