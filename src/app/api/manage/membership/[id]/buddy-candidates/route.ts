import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, roleGate } from "@/lib/auth";
import { getGroup } from "@/lib/membership";

type Params = { params: Promise<{ id: string }> | { id: string } };

function parseTraits(coreTraits: string | undefined | null): string[] {
  return (coreTraits ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * GET /api/manage/membership/[id]/buddy-candidates
 * 새가족의 환영 짝꿍 후보를 정렬 힌트와 함께 반환(운영진 이상).
 * 정렬 기준: ① 같은 나이 집단 ② 같은 꿈터 ③ 성향 태그(coreTraits) 겹침 수.
 * 최종 선택은 운영진의 사람 판단 — 여기서는 순서만 제안한다.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const actor = await getAuthUser();
  const gate = roleGate(actor, "staff");
  if (gate) return gate;

  const { id } = params instanceof Promise ? await params : params;

  const newcomer = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      approvedAge: true,
      dreamGroup: true,
      reports: { orderBy: { createdAt: "desc" }, take: 1, select: { coreTraits: true } },
    },
  });
  if (!newcomer) {
    return NextResponse.json({ ok: false, error: "대상을 찾을 수 없습니다." }, { status: 404 });
  }

  const newcomerGroup = newcomer.approvedAge != null ? getGroup(newcomer.approvedAge) : null;
  const newcomerTraits = new Set(parseTraits(newcomer.reports[0]?.coreTraits));

  const candidates = await prisma.user.findMany({
    where: { id: { not: id }, membershipStatus: "approved", deletedAt: null },
    select: {
      id: true,
      nickname: true,
      avatarUrl: true,
      approvedAge: true,
      dreamGroup: true,
      reports: { orderBy: { createdAt: "desc" }, take: 1, select: { coreTraits: true } },
    },
    take: 300, // 정렬 전 상한 — 대규모 커뮤니티에서도 쿼리 비용을 보호
  });

  const scored = candidates.map((c) => {
    const group = c.approvedAge != null ? getGroup(c.approvedAge) : null;
    const sameGroup = group !== null && group === newcomerGroup;
    const sameDreamGroup =
      !!c.dreamGroup?.trim() && c.dreamGroup.trim() === newcomer.dreamGroup?.trim();
    const traitOverlap = parseTraits(c.reports[0]?.coreTraits).filter((t) =>
      newcomerTraits.has(t),
    ).length;

    return {
      id: c.id,
      nickname: c.nickname,
      avatarUrl: c.avatarUrl,
      dreamGroup: c.dreamGroup,
      group,
      sameGroup,
      sameDreamGroup,
      traitOverlap,
    };
  });

  scored.sort((a, b) => {
    if (a.sameGroup !== b.sameGroup) return a.sameGroup ? -1 : 1;
    if (a.sameDreamGroup !== b.sameDreamGroup) return a.sameDreamGroup ? -1 : 1;
    if (a.traitOverlap !== b.traitOverlap) return b.traitOverlap - a.traitOverlap;
    return (a.nickname ?? "").localeCompare(b.nickname ?? "");
  });

  return NextResponse.json({ ok: true, items: scored.slice(0, 30) });
}
