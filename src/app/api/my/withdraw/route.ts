import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(ip, { windowMs: 60_000, max: 5 })) {
    return NextResponse.json(
      { ok: false, code: "RATE_LIMIT", error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  // PII 익명화 + 소프트 탈퇴.
  // role도 반드시 "member"로 리셋 — 즉시 재가입(쿨다운 없음)이 가능해진 이상,
  // staff/admin이 탈퇴해도 role이 남아있으면 membershipGate/roleGate가 role만 보고
  // membershipStatus와 무관하게 통과시켜 PII 없는 유령 계정이 운영진 권한을 유지하게 된다.
  await prisma.user.update({
    where: { id: user.dbUserId },
    data: {
      deletedAt: new Date(),
      membershipStatus: "none",
      role: "member",
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
