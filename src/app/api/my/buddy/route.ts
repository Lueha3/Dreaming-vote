import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

/**
 * GET /api/my/buddy
 * 본인의 환영 짝꿍 관계 — 새가족으로서 배정받은 짝꿍(myBuddy)과,
 * 본인이 누군가의 짝꿍으로 지정된 경우(newcomersIMentor) 양방향 모두 반환.
 */
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  const [asNewcomer, asBuddy] = await Promise.all([
    prisma.buddyMatch.findUnique({
      where: { newcomerId: user.dbUserId },
      select: { status: true, buddy: { select: { nickname: true, avatarUrl: true } } },
    }),
    prisma.buddyMatch.findMany({
      where: { buddyId: user.dbUserId, status: "active" },
      select: { newcomer: { select: { nickname: true, avatarUrl: true } } },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    myBuddy: asNewcomer && asNewcomer.status === "active" ? asNewcomer.buddy : null,
    newcomersIMentor: asBuddy.map((m) => m.newcomer),
  });
}
