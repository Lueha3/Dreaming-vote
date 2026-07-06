import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, membershipGate } from "@/lib/auth";
import { getGroup } from "@/lib/membership";
import { isNewcomer } from "@/lib/newcomer";

function parseTraits(coreTraits: string | undefined | null): string[] {
  return (coreTraits ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * GET /api/people?sort=similar|dreamgroup|newcomer
 * 멤버 둘러보기 — 승인 멤버만(공동체 로스터 노출은 개별 글 공개보다 보수적으로 다룬다).
 * 실명·전화 등 PII는 절대 포함하지 않는다. 성향은 Report.isPublic인 것만 노출.
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  const gate = membershipGate(user);
  if (gate) return gate;

  const sort = new URL(req.url).searchParams.get("sort") ?? "similar";

  const me = await prisma.user.findUnique({
    where: { id: user.dbUserId },
    select: {
      dreamGroup: true,
      reports: { orderBy: { createdAt: "desc" }, take: 1, select: { coreTraits: true } },
    },
  });
  const myTraits = new Set(parseTraits(me?.reports[0]?.coreTraits));

  const candidates = await prisma.user.findMany({
    where: { id: { not: user.dbUserId }, membershipStatus: "approved", deletedAt: null },
    select: {
      id: true,
      nickname: true,
      avatarUrl: true,
      approvedAge: true,
      dreamGroup: true,
      membershipDecidedAt: true,
      reports: {
        where: { isPublic: true },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { catchphrase: true, coreTraits: true },
      },
      _count: { select: { clubApplications: { where: { status: "accepted" } } } },
    },
    take: 500, // 대규모 커뮤니티에서도 쿼리 비용 보호(정렬은 이후 메모리에서)
  });

  const items = candidates.map((c) => {
    const traits = parseTraits(c.reports[0]?.coreTraits);
    return {
      id: c.id,
      nickname: c.nickname,
      avatarUrl: c.avatarUrl,
      group: c.approvedAge != null ? getGroup(c.approvedAge) : null,
      dreamGroup: c.dreamGroup,
      isNewcomer: isNewcomer(c.membershipDecidedAt),
      catchphrase: c.reports[0]?.catchphrase ?? null,
      traitOverlap: traits.filter((t) => myTraits.has(t)).length,
      clubCount: c._count.clubApplications,
      membershipDecidedAt: c.membershipDecidedAt,
      sameDreamGroup: !!c.dreamGroup?.trim() && c.dreamGroup.trim() === me?.dreamGroup?.trim(),
    };
  });

  if (sort === "dreamgroup") {
    items.sort((a, b) => {
      if (a.sameDreamGroup !== b.sameDreamGroup) return a.sameDreamGroup ? -1 : 1;
      return b.traitOverlap - a.traitOverlap;
    });
  } else if (sort === "newcomer") {
    items.sort((a, b) => {
      if (a.isNewcomer !== b.isNewcomer) return a.isNewcomer ? -1 : 1;
      const at = a.membershipDecidedAt ? new Date(a.membershipDecidedAt).getTime() : 0;
      const bt = b.membershipDecidedAt ? new Date(b.membershipDecidedAt).getTime() : 0;
      return bt - at;
    });
  } else {
    items.sort((a, b) => b.traitOverlap - a.traitOverlap);
  }

  // membershipDecidedAt·sameDreamGroup은 정렬용 내부 필드 — 응답엔 필요한 필드만 명시적으로 내려준다.
  const publicItems = items.map((it) => ({
    id: it.id,
    nickname: it.nickname,
    avatarUrl: it.avatarUrl,
    group: it.group,
    dreamGroup: it.dreamGroup,
    isNewcomer: it.isNewcomer,
    catchphrase: it.catchphrase,
    traitOverlap: it.traitOverlap,
    clubCount: it.clubCount,
  }));

  return NextResponse.json({ ok: true, items: publicItems });
}
