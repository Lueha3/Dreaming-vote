import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function POST() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  // PII 익명화 + 소프트 탈퇴
  await prisma.user.update({
    where: { id: user.dbUserId },
    data: {
      deletedAt: new Date(),
      membershipStatus: "none",
      nickname: null,
      avatarUrl: null,
      realName: null,
      age: null,
      gender: null,
      dreamGroup: null,
      phone: null,
      membershipAppliedAt: null,
      membershipDecidedAt: null,
      membershipNote: null,
    },
  });

  // 소유 동아리 비공개 처리 (탈퇴자 동아리 자동 숨김)
  await prisma.club.updateMany({
    where: { ownerUserId: user.dbUserId },
    data: { isActive: false },
  });

  console.log(`[withdraw] userId=${user.dbUserId} supabaseId=${user.supabaseId}`);

  return NextResponse.json({ ok: true });
}
