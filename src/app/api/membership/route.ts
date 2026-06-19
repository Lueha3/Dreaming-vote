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
  const [me, ownedActiveClubs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.dbUserId },
      // summary 모드는 본인 PII(realName·age·gender·phone)를 select 자체에서 제외해
      // 응답·서버 메모리 어디에도 싣지 않는다.
      select: summary
        ? { membershipStatus: true, nickname: true }
        : {
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
