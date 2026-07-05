import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { isNewcomer } from "@/lib/newcomer";

/**
 * GET /api/my/onboarding
 * 새가족 체크리스트 — 승인 후 일정 기간(lib/newcomer.ts)에만 표시.
 * 4개 항목 모두 기존 테이블에서 파생(별도 진행 상태 저장 없음).
 * "첫 교류"는 본인이 직접 쓴 글/댓글만 인정 — 승인 시 자동 게시되는 환영 카드
 * (systemType: "welcome")는 제외해야 체크리스트의 의미가 있다.
 */
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (user.membershipStatus !== "approved") {
    return NextResponse.json({ ok: true, show: false });
  }

  const me = await prisma.user.findUnique({
    where: { id: user.dbUserId },
    select: { membershipDecidedAt: true },
  });
  if (!isNewcomer(me?.membershipDecidedAt ?? null)) {
    return NextResponse.json({ ok: true, show: false });
  }

  const [pushCount, reportCount, clubCount, postCount, commentCount] = await Promise.all([
    prisma.pushSubscription.count({ where: { userId: user.dbUserId } }),
    prisma.report.count({ where: { userId: user.dbUserId } }),
    prisma.clubApplication.count({ where: { userId: user.dbUserId, status: "accepted" } }),
    prisma.prayer.count({ where: { userId: user.dbUserId, systemType: null } }),
    prisma.prayerComment.count({ where: { userId: user.dbUserId } }),
  ]);

  return NextResponse.json({
    ok: true,
    show: true,
    steps: {
      pushEnabled: pushCount > 0,
      personalityDone: reportCount > 0,
      clubJoined: clubCount > 0,
      firstEngagement: postCount > 0 || commentCount > 0,
    },
  });
}
