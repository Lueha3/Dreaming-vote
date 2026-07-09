import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, membershipGate } from "@/lib/auth";

/** GET /api/recap/latest — 승인 멤버 대상, 가장 최근 월간 리캡 1건(없으면 null). */
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  const gate = membershipGate(user);
  if (gate) return gate;

  const recap = await prisma.monthlyRecap.findFirst({
    orderBy: { monthOf: "desc" },
  });

  if (!recap) return NextResponse.json({ ok: true, recap: null });

  return NextResponse.json({
    ok: true,
    recap: {
      monthOf: recap.monthOf.toISOString(),
      postCount: recap.postCount,
      reactionCount: recap.reactionCount,
      commentCount: recap.commentCount,
      newcomerCount: recap.newcomerCount,
      birthdayCount: recap.birthdayCount,
      answeredPrayerCount: recap.answeredPrayerCount,
      topPostSnippet: recap.topPostSnippet,
      topPostAuthorName: recap.topPostAuthorName,
      topPostReactionCount: recap.topPostReactionCount,
    },
  });
}
