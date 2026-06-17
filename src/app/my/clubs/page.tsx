import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CLUB_CATEGORY_META } from "@/lib/clubCategories";
import { OwnedClubCard, type OwnedClub } from "./OwnedClubCard";

// getAuthUser가 쿠키를 읽으므로 동적.
export const dynamic = "force-dynamic";

type AppliedClub = {
  applicationId: string;
  status: string;
  clubId: string;
  clubName: string;
  category: string;
  clubVisible: boolean;
};

/**
 * 내 동아리 — 서버 컴포넌트.
 * 기존: 클라 getUser()(네트워크) → /api/my/clubs 직렬 워터폴 → 서버 1패스 SSR.
 * 개설/신청 목록을 SSR로 받고, 신청 관리(수락/거절)만 OwnedClubCard(클라).
 */
export default async function MyClubsPage() {
  const user = await getAuthUser();

  /* ── 비로그인 ─────────────────────────────────────────────── */
  if (!user) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
        <div className="relative px-6 text-center">
          <div className="mb-6 text-5xl">🔐</div>
          <h2 className="mb-3 text-2xl font-bold text-ink">로그인이 필요합니다</h2>
          <p className="mb-8 text-sm text-ink-soft">내 동아리를 보려면 로그인을 해주세요.</p>
          <Link
            href="/login?next=/my/clubs"
            className="btn-gold btn-glow inline-block rounded-full px-6 py-3 text-sm font-semibold"
          >
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  const [ownedRaw, appliedRaw] = await Promise.all([
    prisma.club.findMany({
      where: { ownerUserId: user.dbUserId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        category: true,
        isApproved: true,
        isActive: true,
        maxMembers: true,
        viewCount: true,
        createdAt: true,
        applications: { select: { status: true } },
      },
    }),
    prisma.clubApplication.findMany({
      where: { userId: user.dbUserId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        club: {
          select: {
            id: true,
            name: true,
            category: true,
            isApproved: true,
            isActive: true,
            ownerUserId: true,
          },
        },
      },
    }),
  ]);

  const owned: OwnedClub[] = ownedRaw.map((c) => ({
    id: c.id,
    name: c.name,
    category: c.category,
    isApproved: c.isApproved,
    isActive: c.isActive,
    maxMembers: c.maxMembers,
    viewCount: c.viewCount,
    createdAt: c.createdAt.toISOString(),
    memberCount: c.applications.filter((a) => a.status === "accepted").length,
    pendingCount: c.applications.filter((a) => a.status === "pending").length,
  }));

  const applied: AppliedClub[] = appliedRaw
    .filter((a) => a.club.ownerUserId !== user.dbUserId)
    .map((a) => ({
      applicationId: a.id,
      status: a.status,
      clubId: a.club.id,
      clubName: a.club.name,
      category: a.club.category,
      clubVisible: a.club.isApproved && a.club.isActive,
    }));

  /* ── 메인 ─────────────────────────────────────────────────── */
  return (
    <main className="mx-auto max-w-2xl px-4 pt-6 pb-16">
        {/* 헤더 */}
        <div className="mb-6 flex justify-end">
          <Link href="/clubs/new" className="btn-gold btn-glow rounded-full px-4 py-2 text-xs font-semibold">
            + 동아리 개설
          </Link>
        </div>

        {/* 내가 개설한 동아리 */}
        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <span>🚩</span> 내가 개설한 동아리
            <span className="text-ink-faint">({owned.length})</span>
          </h2>
          {owned.length === 0 ? (
            <div className="glass-card px-6 py-10 text-center">
              <p className="mb-1 text-sm text-ink-soft">아직 개설한 동아리가 없어요.</p>
              <Link
                href="/clubs/new"
                className="mt-3 inline-block text-sm font-medium text-teal-ink hover:text-teal-deep"
              >
                + 첫 동아리 개설하기
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {owned.map((club) => (
                <OwnedClubCard key={club.id} club={club} />
              ))}
            </ul>
          )}
        </section>

        {/* 내가 신청한 동아리 */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <span>✋</span> 내가 신청한 동아리
            <span className="text-ink-faint">({applied.length})</span>
          </h2>
          {applied.length === 0 ? (
            <div className="glass-card px-6 py-10 text-center">
              <p className="mb-1 text-sm text-ink-soft">아직 신청한 동아리가 없어요.</p>
              <Link
                href="/clubs"
                className="mt-3 inline-block text-sm font-medium text-teal-ink hover:text-teal-deep"
              >
                동아리 둘러보기 →
              </Link>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {applied.map((a) => (
                <li key={a.applicationId}>
                  <AppliedRow item={a} />
                </li>
              ))}
            </ul>
          )}
        </section>
    </main>
  );
}

/* ── 신청한 동아리 행 (표시 전용) ──────────────────────────────── */

function AppliedRow({ item }: { item: AppliedClub }) {
  const badge =
    item.status === "accepted" ? (
      <span className="shrink-0 rounded-full border border-teal/35 bg-teal/10 px-2.5 py-0.5 text-xs font-medium text-teal-ink">
        가입됨
      </span>
    ) : item.status === "pending" ? (
      <span className="shrink-0 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-xs font-medium text-gold-ink">
        대기 중
      </span>
    ) : (
      <span className="shrink-0 rounded-full border border-sky-line bg-white/60 px-2.5 py-0.5 text-xs font-medium text-ink-faint">
        거절됨
      </span>
    );

  const inner = (
    <div className="glass-card flex items-center justify-between gap-3 px-4 py-3.5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-base">{CLUB_CATEGORY_META[item.category]?.emoji ?? "✨"}</span>
        <span className="truncate text-sm font-medium text-ink">{item.clubName}</span>
      </div>
      {badge}
    </div>
  );

  return item.clubVisible ? (
    <Link href={`/clubs/${item.clubId}`} className="block transition-opacity hover:opacity-80">
      {inner}
    </Link>
  ) : (
    <div className="opacity-60">{inner}</div>
  );
}
