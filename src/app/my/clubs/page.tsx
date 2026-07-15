import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ClubCategoryIcon } from "@/components/icons";
import { OwnedClubCard, type OwnedClub } from "./OwnedClubCard";
import { LeaveClubButton } from "./LeaveClubButton";

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

type ScheduleItem = {
  id: string;
  clubId: string;
  title: string;
  meetsAt: string; // ISO
  place: string;
  clubName: string;
  category: string;
  going: boolean;
};

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

/** KST 기준 날짜/시간 포맷 — 서버(UTC)와 무관하게 일관 표시. */
function fmtSchedule(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const mm = kst.getUTCMonth() + 1;
  const dd = kst.getUTCDate();
  const day = DAY_LABELS[kst.getUTCDay()];
  let h = kst.getUTCHours();
  const min = kst.getUTCMinutes();
  const ampm = h < 12 ? "오전" : "오후";
  h = h % 12 || 12;
  const time = min === 0 ? `${ampm} ${h}시` : `${ampm} ${h}:${String(min).padStart(2, "0")}`;
  return { date: `${mm}/${dd}(${day})`, time };
}

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
    // 나간/내보내진 신청은 '신청한 동아리'에서 숨긴다(다시 신청은 동아리 페이지에서 가능).
    .filter(
      (a) =>
        a.club.ownerUserId !== user.dbUserId &&
        a.status !== "left" &&
        a.status !== "removed",
    )
    .map((a) => ({
      applicationId: a.id,
      status: a.status,
      clubId: a.club.id,
      clubName: a.club.name,
      category: a.club.category,
      clubVisible: a.club.isApproved && a.club.isActive,
    }));

  /* ── 내 모임 일정 — 개설 + 가입한 동아리(전체 행사 보드 포함)의 예정 모임을 한곳에 ──
     참석 여부와 무관하게 등록된 모든 예정 모임을 노출하고, '가요' 표시한 모임엔 배지를 붙인다. */
  const myClubIds = [
    ...new Set([
      ...ownedRaw.map((c) => c.id),
      ...appliedRaw.filter((a) => a.status === "accepted").map((a) => a.club.id),
    ]),
  ];

  // KST 기준 오늘 0시(=UTC로 환산)부터의 모임만 — 지난 모임은 일정표에서 제외.
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const kstTodayStart = new Date(
    Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) - 9 * 60 * 60 * 1000,
  );

  const meetingsRaw = myClubIds.length
    ? await prisma.clubMeeting.findMany({
        where: { clubId: { in: myClubIds }, meetsAt: { gte: kstTodayStart } },
        orderBy: { meetsAt: "asc" },
        take: 100,
        select: {
          id: true,
          clubId: true,
          title: true,
          meetsAt: true,
          place: true,
          club: { select: { name: true, category: true } },
          rsvps: { where: { userId: user.dbUserId }, select: { status: true } },
        },
      })
    : [];

  const schedule: ScheduleItem[] = meetingsRaw.map((m) => ({
    id: m.id,
    clubId: m.clubId,
    title: m.title,
    meetsAt: m.meetsAt.toISOString(),
    place: m.place,
    clubName: m.club.name,
    category: m.club.category,
    going: m.rsvps[0]?.status === "going",
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

        {/* 내 모임 일정 — 가입/개설한 동아리의 예정 모임 모아보기 */}
        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <span>📅</span> 내 모임 일정
            <span className="text-ink-faint">({schedule.length})</span>
          </h2>
          {schedule.length === 0 ? (
            <div className="glass-card px-6 py-10 text-center">
              <p className="mb-1 text-sm text-ink-soft">예정된 모임이 없어요.</p>
              <p className="text-xs text-ink-faint">
                가입한 동아리에 새 모임이 등록되면 여기에 모여요.
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {schedule.map((m) => (
                <MyScheduleRow key={m.id} item={m} />
              ))}
            </ul>
          )}
        </section>

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
                  {a.status === "accepted" && (
                    <div className="mt-1.5 flex justify-end px-1">
                      <LeaveClubButton clubId={a.clubId} clubName={a.clubName} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
    </main>
  );
}

/* ── 내 모임 일정 행 ──────────────────────────────────────────── */

function MyScheduleRow({ item }: { item: ScheduleItem }) {
  const { date, time } = fmtSchedule(item.meetsAt);
  return (
    <li>
      <Link
        href={`/clubs/${item.clubId}/meetings/${item.id}`}
        className="glass-card flex items-center gap-3 px-4 py-3.5 transition-all hover:bg-white/85"
      >
        {/* 날짜 블록 */}
        <div className="flex w-14 shrink-0 flex-col items-center rounded-xl border border-gold/40 bg-gold/10 py-1.5">
          <span className="text-[11px] font-semibold text-gold-ink">{date}</span>
          <span className="mt-0.5 text-[10px] text-ink-soft">{time}</span>
        </div>

        {/* 내용 */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-bold text-ink">{item.title}</span>
            {item.going && (
              <span className="shrink-0 rounded-full border border-teal/40 bg-teal/15 px-2 py-0.5 text-[10px] font-bold text-teal-ink">
                🙋 가요!
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-ink-soft">
            <ClubCategoryIcon
              category={item.category}
              tone="inherit"
              className="mr-1 inline-block h-3.5 w-3.5 align-[-0.15em]"
            />
            {item.clubName}
            {item.place ? ` · ${item.place}` : ""}
          </p>
        </div>

        <span className="shrink-0 text-skyx-ink">→</span>
      </Link>
    </li>
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
        <ClubCategoryIcon category={item.category} className="h-4 w-4 shrink-0" />
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
