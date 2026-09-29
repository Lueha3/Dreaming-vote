import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, membershipGate } from "@/lib/auth";
import { getGroup } from "@/lib/membership";
import { isNewcomer } from "@/lib/newcomer";
import { FEATURES } from "@/lib/features";

function parseTraits(coreTraits: string | undefined | null): string[] {
  return (coreTraits ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * GET /api/people
 * 멤버 둘러보기 — 승인 멤버만(공동체 로스터 노출은 개별 글 공개보다 보수적으로 다룬다).
 * 실명·전화 등 PII는 절대 포함하지 않는다. 성향은 Report.isPublic인 것만 노출.
 *
 * 정렬 탭(비슷한 성향·같은 꿈터·새가족 먼저)은 v2에서 뺐다 — 이 화면은 단순 목록만 한다.
 * 이름(닉네임의 마지막 조각) 가나다순으로 내려준다.
 */
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  const gate = membershipGate(user);
  if (gate) return gate;

  // 성향(Report) 기반 값은 성격유형 기능이 켜져 있을 때만 계산한다.
  const me = FEATURES.archetype
    ? await prisma.user.findUnique({
        where: { id: user.dbUserId },
        select: { reports: { orderBy: { createdAt: "desc" }, take: 1, select: { coreTraits: true } } },
      })
    : null;
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
    const traits = FEATURES.archetype ? parseTraits(c.reports[0]?.coreTraits) : [];
    return {
      id: c.id,
      nickname: c.nickname,
      avatarUrl: c.avatarUrl,
      age: c.approvedAge,
      group: c.approvedAge != null ? getGroup(c.approvedAge) : null,
      dreamGroup: c.dreamGroup,
      isNewcomer: isNewcomer(c.membershipDecidedAt),
      catchphrase: FEATURES.archetype ? (c.reports[0]?.catchphrase ?? null) : null,
      traitOverlap: traits.filter((t) => myTraits.has(t)).length,
      clubCount: c._count.clubApplications,
    };
  });

  // 이름 가나다순 — 닉네임이 "집단-나이-이름" 형식이라 통째로 정렬하면 집단·나이가 먼저 묶이므로,
  // 마지막 하이픈 뒤의 이름 부분만 뽑아 비교한다(형식이 다른 닉네임은 전체를 이름으로 본다).
  // 이름이 같으면 전체 닉네임으로 순서를 고정하고, 닉네임이 없는 행은 방어적으로 맨 뒤로 보낸다.
  const nameOf = (nickname: string | null) => (nickname ? nickname.split("-").pop()! : "￿");
  items.sort((a, b) => {
    const byName = nameOf(a.nickname).localeCompare(nameOf(b.nickname), "ko");
    if (byName !== 0) return byName;
    return (a.nickname ?? "￿").localeCompare(b.nickname ?? "￿", "ko");
  });

  const publicItems = items;

  return NextResponse.json({ ok: true, items: publicItems });
}
