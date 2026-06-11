"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchJson } from "@/lib/http";
import { CLUB_CATEGORY_META } from "@/lib/clubCategories";

type OwnedClub = {
  id: string;
  name: string;
  category: string;
  isApproved: boolean;
  isActive: boolean;
  maxMembers: number | null;
  viewCount: number;
  createdAt: string;
  memberCount: number;
  pendingCount: number;
};

type AppliedClub = {
  applicationId: string;
  status: string;
  createdAt: string;
  clubId: string;
  clubName: string;
  category: string;
  clubVisible: boolean;
};

export default function MyClubsPage() {
  const [owned, setOwned] = useState<OwnedClub[]>([]);
  const [applied, setApplied] = useState<AppliedClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [notLoggedIn, setNotLoggedIn] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchJson<{ ok: true; owned: OwnedClub[]; applied: AppliedClub[] }>(
        "/api/my/clubs",
      );
      setOwned(data.owned ?? []);
      setApplied(data.applied ?? []);
    } catch {
      setNotLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setNotLoggedIn(true);
        setLoading(false);
        return;
      }
      await load();
      setLoading(false);
    });
  }, [load]);

  /* ── 로딩 ─────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <main className="relative mx-auto max-w-2xl px-4 py-14">
          <div className="h-8 w-40 animate-pulse rounded bg-white/55" />
          <div className="mt-6 space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="glass-card h-28 animate-pulse"
              />
            ))}
          </div>
        </main>
      </div>
    );
  }

  /* ── 비로그인 ─────────────────────────────────────────────── */
  if (notLoggedIn) {
    return (
      <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
        <div className="relative text-center px-6">
          <div className="mb-6 text-5xl">🔐</div>
          <h2 className="mb-3 text-2xl font-bold text-ink">로그인이 필요합니다</h2>
          <p className="mb-8 text-sm text-ink-soft">내 동아리를 보려면 로그인을 해주세요.</p>
          <Link
            href="/login?next=/my/clubs"
            className="btn-gold inline-block rounded-full px-6 py-3 text-sm font-semibold btn-glow"
          >
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  /* ── 메인 ─────────────────────────────────────────────────── */
  return (
    <div className="relative min-h-screen overflow-hidden">
      <main className="relative mx-auto max-w-2xl px-4 py-14">
        {/* 헤더 */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <Link href="/my" className="text-xs text-ink-soft transition-colors hover:text-ink">
              ← 내 정보
            </Link>
            <h1 className="mt-3 text-2xl font-bold text-ink">내 동아리</h1>
          </div>
          <Link
            href="/clubs/new"
            className="btn-gold rounded-full px-4 py-2 text-xs font-semibold btn-glow"
          >
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
                <OwnedClubCard key={club.id} club={club} onChanged={load} />
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
    </div>
  );
}

/* ── 개설 동아리 카드 (신청 관리 포함) ──────────────────────────── */

type AppItem = {
  id: string;
  message: string | null;
  status: string;
  createdAt: string;
  applicantNickname: string | null;
  applicantAvatarUrl: string | null;
};

function OwnedClubCard({ club, onChanged }: { club: OwnedClub; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [apps, setApps] = useState<AppItem[] | null>(null);
  const [loadingApps, setLoadingApps] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actError, setActError] = useState<string | null>(null);

  const loadApps = useCallback(async () => {
    setLoadingApps(true);
    setActError(null);
    try {
      const data = await fetchJson<{ ok: true; items: AppItem[] }>(
        `/api/clubs/${club.id}/applications`,
      );
      setApps(data.items ?? []);
    } catch {
      setApps([]);
    }
    setLoadingApps(false);
  }, [club.id]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && apps === null) loadApps();
  }

  async function act(appId: string, action: "accept" | "reject") {
    setBusyId(appId);
    setActError(null);
    try {
      await fetchJson(`/api/clubs/${club.id}/applications/${appId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await loadApps();
      onChanged();
    } catch (e) {
      setActError(e instanceof Error ? e.message : "처리에 실패했습니다.");
    }
    setBusyId(null);
  }

  const statusBadge = !club.isApproved ? (
    <span className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-xs font-medium text-gold-ink">
      승인 대기
    </span>
  ) : club.isActive ? (
    <span className="rounded-full border border-teal/35 bg-teal/10 px-2.5 py-0.5 text-xs font-medium text-teal-ink">
      모집 중
    </span>
  ) : (
    <span className="rounded-full border border-sky-line bg-white/60 px-2.5 py-0.5 text-xs font-medium text-ink-faint">
      숨김
    </span>
  );

  return (
    <li className="glass-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="text-lg">{CLUB_CATEGORY_META[club.category]?.emoji ?? "✨"}</span>
            <Link
              href={`/clubs/${club.id}`}
              className="truncate font-semibold text-ink hover:text-teal-ink"
            >
              {club.name}
            </Link>
            {statusBadge}
          </div>
          <p className="text-xs text-ink-faint">
            멤버 {club.memberCount}
            {club.maxMembers ? `/${club.maxMembers}` : ""}명 · 조회 {club.viewCount}
          </p>
        </div>

        <button
          onClick={toggle}
          className="glass-soft relative shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium text-ink-soft transition-all hover:bg-white/90 hover:text-ink"
        >
          신청 관리
          {club.pendingCount > 0 && (
            <span className="ml-1.5 rounded-full bg-gold/20 px-1.5 py-0.5 text-xs text-gold-ink">
              {club.pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* 신청 관리 패널 */}
      {open && (
        <div className="mt-4 border-t border-sky-line pt-4">
          {loadingApps ? (
            <p className="py-4 text-center text-xs text-ink-faint">신청 내역 불러오는 중...</p>
          ) : !apps || apps.length === 0 ? (
            <p className="py-4 text-center text-xs text-ink-faint">아직 가입 신청이 없어요.</p>
          ) : (
            <ul className="space-y-2.5">
              {apps.map((a) => (
                <li
                  key={a.id}
                  className="glass-soft rounded-xl p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2">
                      {a.applicantAvatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={a.applicantAvatarUrl}
                          alt=""
                          className="mt-0.5 h-6 w-6 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-skyx/25 text-xs text-skyx-ink">
                          {(a.applicantNickname ?? "익")[0]}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">
                          {a.applicantNickname ?? "익명"}
                        </p>
                        {a.message && (
                          <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-ink-faint">
                            {a.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {a.status === "pending" ? (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => act(a.id, "accept")}
                            disabled={busyId === a.id}
                            className="rounded-lg border border-teal/35 bg-teal/10 px-2.5 py-1 text-xs font-medium text-teal-ink transition-all hover:bg-teal/20 disabled:opacity-40"
                          >
                            수락
                          </button>
                          <button
                            onClick={() => act(a.id, "reject")}
                            disabled={busyId === a.id}
                            className="glass-soft rounded-lg px-2.5 py-1 text-xs font-medium text-ink-soft transition-all hover:border-red-300/60 hover:text-red-500 disabled:opacity-40"
                          >
                            거절
                          </button>
                        </div>
                      ) : a.status === "accepted" ? (
                        <span className="text-xs font-medium text-teal-ink">수락됨 ✓</span>
                      ) : (
                        <span className="text-xs font-medium text-ink-faint">거절됨</span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {actError && <p className="mt-2 text-xs text-red-500">{actError}</p>}
        </div>
      )}
    </li>
  );
}

/* ── 신청한 동아리 행 ──────────────────────────────────────────── */

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
