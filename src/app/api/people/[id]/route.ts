import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, membershipGate } from "@/lib/auth";
import { getGroup } from "@/lib/membership";
import { isNewcomer } from "@/lib/newcomer";
import { getWeekMonday } from "@/lib/week";
import { computeBuddyRelation } from "@/lib/buddy";
import type { Role } from "@/lib/roles";

type Params = { params: Promise<{ id: string }> | { id: string } };

function parseTraits(coreTraits: string | undefined | null): string[] {
  return (coreTraits ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * GET /api/people/[id] — 프로필 피크(아바타 탭 시 뜨는 미니 프로필)용 단건 조회.
 * /api/people 목록과 동일한 PII 최소화 원칙 — 실명·전화 등은 절대 포함하지 않는다.
 */
export async function GET(_req: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  const gate = membershipGate(user);
  if (gate) return gate;

  const { id } = params instanceof Promise ? await params : params;

  const target = await prisma.user.findFirst({
    where: { id, membershipStatus: "approved", deletedAt: null },
    select: {
      id: true,
      nickname: true,
      avatarUrl: true,
      role: true,
      approvedAge: true,
      dreamGroup: true,
      gender: true,
      membershipDecidedAt: true,
      reports: {
        where: { isPublic: true },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { catchphrase: true, coreTraits: true },
      },
    },
  });
  if (!target) {
    return NextResponse.json({ ok: false, error: "멤버를 찾을 수 없어요." }, { status: 404 });
  }

  // 짝꿍 관계 상태 — 뷰어↔대상. 성별 원값은 노출하지 않고 파생 상태만 내려준다(PII 최소화).
  // AuthUser엔 gender가 없어 뷰어 성별만 가볍게 조회한다.
  const viewer = await prisma.user.findUnique({
    where: { id: user.dbUserId },
    select: { gender: true },
  });
  const buddy = await computeBuddyRelation(
    { id: user.dbUserId, gender: viewer?.gender ?? null },
    { id: target.id, gender: target.gender },
  );

  const weekOf = getWeekMonday(new Date());
  const [postCount, currentPrompt, acceptedClub] = await Promise.all([
    prisma.prayer.count({ where: { userId: id, isAnonymous: false, systemType: null } }),
    prisma.icebreakerPrompt.findUnique({ where: { weekOf }, select: { id: true } }),
    prisma.clubApplication.findFirst({
      where: { userId: id, status: "accepted" },
      orderBy: { createdAt: "desc" },
      select: { club: { select: { name: true } } },
    }),
  ]);

  let answeredThisWeek = false;
  if (currentPrompt) {
    const answered = await prisma.prayer.findFirst({
      where: { userId: id, promptId: currentPrompt.id },
      select: { id: true },
    });
    answeredThisWeek = !!answered;
  }

  const parts: string[] = [];
  if (answeredThisWeek) parts.push("이번 주 질문에 답했어요");
  if (postCount > 0) parts.push(`글 ${postCount}개`);
  if (acceptedClub?.club.name) parts.push(acceptedClub.club.name);

  return NextResponse.json({
    ok: true,
    profile: {
      id: target.id,
      nickname: target.nickname,
      avatarUrl: target.avatarUrl,
      role: target.role as Role,
      group: target.approvedAge != null ? getGroup(target.approvedAge) : null,
      dreamGroup: target.dreamGroup,
      isNewcomer: isNewcomer(target.membershipDecidedAt),
      catchphrase: target.reports[0]?.catchphrase ?? null,
      traits: parseTraits(target.reports[0]?.coreTraits).slice(0, 2),
      activityLine: parts.length > 0 ? parts.join(" · ") : "아직 활동 기록이 없어요",
      buddy: { state: buddy.state, matchId: buddy.matchId },
    },
  });
}
