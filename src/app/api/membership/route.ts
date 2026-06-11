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

  const me = await prisma.user.findUnique({
    where: { id: user.dbUserId },
    select: {
      membershipStatus: true,
      realName: true,
      age: true,
      gender: true,
      dreamGroup: true,
      phone: true,
      membershipAppliedAt: true,
      membershipNote: true,
    },
  });

  if (!me) {
    return NextResponse.json({ ok: false, error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, membership: me });
}
