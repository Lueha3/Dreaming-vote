"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchJson } from "@/lib/http";
import { CLUB_CATEGORY_META } from "@/lib/clubCategories";

export type OwnedClub = {
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

type AppItem = {
  id: string;
  message: string | null;
  status: string;
  createdAt: string;
  applicantNickname: string | null;
  applicantAvatarUrl: string | null;
};

/**
 * 개설 동아리 카드 — 신청 내역 lazy 로드 + 수락/거절(클라이언트).
 * 수락/거절 후 router.refresh()로 서버에서 memberCount/pendingCount를 재계산해 배지 동기화.
 */
export function OwnedClubCard({ club }: { club: OwnedClub }) {
  const router = useRouter();
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
      router.refresh(); // SSR된 멤버/대기 카운트 재계산
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

        <div className="flex shrink-0 items-center gap-1.5">
          <Link
            href={`/clubs/${club.id}/edit`}
            className="glass-soft rounded-xl px-3 py-1.5 text-xs font-medium text-ink-soft transition-all hover:bg-white/90 hover:text-ink"
          >
            ✏️ 수정
          </Link>
          <button
            onClick={toggle}
            className="glass-soft relative rounded-xl px-3 py-1.5 text-xs font-medium text-ink-soft transition-all hover:bg-white/90 hover:text-ink"
          >
            신청 관리
            {club.pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-gold/20 px-1.5 py-0.5 text-xs text-gold-ink">
                {club.pendingCount}
              </span>
            )}
          </button>
        </div>
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
                <li key={a.id} className="glass-soft rounded-xl p-3">
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
                        <p className="text-sm font-medium text-ink">{a.applicantNickname ?? "익명"}</p>
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
