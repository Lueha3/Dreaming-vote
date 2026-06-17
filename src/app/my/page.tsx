import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RoleBadge } from "@/components/RoleBadge";
import { displayRoles } from "@/lib/roles";
import { MyReportsList, type ReportItem } from "./MyReportsList";

// getAuthUser가 쿠키를 읽으므로 정적 프리렌더 불가 — 명시적으로 동적.
export const dynamic = "force-dynamic";

/**
 * 내 성향 카드 — 서버 컴포넌트.
 * 기존: 클라 getUser()(네트워크) → /api/membership → /api/reports/me 직렬 워터폴(Auth 왕복 3회).
 * 변경: 서버에서 getAuthUser() 1회 + Promise.all(리포트·동아리장 판정)로 1패스 SSR.
 * PII(phone/realName/gender/age)는 select하지 않아 클라로 새지 않는다.
 */
export default async function MyPage() {
  const user = await getAuthUser();

  /* ── 비로그인 ─────────────────────────────────────────────── */
  if (!user) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
        <div className="relative px-6 text-center">
          <div className="mb-6 text-5xl">🔐</div>
          <h2 className="mb-3 text-2xl font-bold text-ink">로그인이 필요합니다</h2>
          <p className="mb-8 text-sm leading-relaxed text-ink-soft">
            내 성향 카드를 보려면 로그인을 해주세요.
          </p>
          <Link
            href="/login?next=/my"
            className="btn-gold btn-glow inline-block rounded-full px-6 py-3 text-sm font-semibold"
          >
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  const [reportsRaw, ownedActiveClubs] = await Promise.all([
    prisma.report.findMany({
      where: { userId: user.dbUserId },
      orderBy: { createdAt: "desc" },
      select: {
        shareSlug: true,
        catchphrase: true,
        coreTraits: true,
        sourceAi: true,
        isPublic: true,
        viewCount: true,
        createdAt: true,
      },
    }),
    // 동아리장 배지는 전역 role이 아니라 활성 동아리 소유 여부로 파생.
    prisma.club.count({ where: { ownerUserId: user.dbUserId, isActive: true } }),
  ]);

  const items: ReportItem[] = reportsRaw.map((r) => ({
    shareSlug: r.shareSlug,
    catchphrase: r.catchphrase,
    coreTraits: r.coreTraits,
    sourceAi: r.sourceAi,
    viewCount: r.viewCount,
    isPublic: r.isPublic,
    createdAt: r.createdAt.toISOString(),
  }));

  const { nickname, avatarUrl, role, membershipStatus } = user;
  const isClubLeader = ownedActiveClubs > 0;

  /* ── 메인 ─────────────────────────────────────────────────── */
  return (
    <div className="relative min-h-screen overflow-hidden">
      <main className="relative mx-auto max-w-2xl px-4 py-14">
        {/* 멤버십 배너 — 승인되면 숨김 */}
        {membershipStatus !== "approved" &&
          (membershipStatus === "pending" ? (
            <Link
              href="/join"
              className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-skyx/45 bg-skyx/15 px-4 py-3.5 transition-all hover:border-skyx/60"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">⏳</span>
                <div>
                  <p className="text-sm font-semibold text-skyx-ink">가입 승인을 기다리는 중이에요</p>
                  <p className="text-xs text-skyx-ink/70">
                    승인되면 닉네임(집단-나이-이름)이 자동으로 만들어져요
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-xs text-skyx-ink">신청 내용 보기 →</span>
            </Link>
          ) : (
            <Link
              href="/join"
              className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3.5 transition-all hover:border-gold/60"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">⛪</span>
                <div>
                  <p className="text-sm font-semibold text-gold-ink">청년부 가입 신청을 해주세요</p>
                  <p className="text-xs text-gold-ink/70">
                    승인되면 닉네임(집단-나이-이름)이 자동으로 만들어져요 · 동아리 참여 전 필수
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-xs text-gold-ink">신청하기 →</span>
            </Link>
          ))}

        {/* 프로필 헤더 */}
        <div className="mb-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt="프로필"
                  className="h-10 w-10 rounded-full object-cover ring-2 ring-skyx/30"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-skyx/25 text-lg ring-2 ring-skyx/30">
                  👤
                </div>
              )}
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="font-semibold text-ink">{nickname ?? "나"}</p>
                  {displayRoles(role, { isClubLeader }).map((r) => (
                    <RoleBadge key={r} role={r} size="sm" />
                  ))}
                </div>
                <p className="text-xs text-ink-soft">성향 카드 {items.length}개</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/my/profile"
                className="glass-soft rounded-full px-3 py-2 text-xs text-ink-soft transition-all hover:bg-white/90 hover:text-ink"
              >
                프로필 설정
              </Link>
              <Link href="/" className="btn-gold btn-glow rounded-full px-4 py-2 text-xs font-semibold">
                + 새 성향 카드
              </Link>
            </div>
          </div>
        </div>

        {/* 타이틀 */}
        <h1 className="mb-6 text-2xl font-bold text-ink">내 성향 카드</h1>

        {/* 리스트 (공개/비공개 토글만 클라이언트) */}
        <MyReportsList initialItems={items} />
      </main>
    </div>
  );
}
