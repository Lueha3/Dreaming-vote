"use client";

import Link from "next/link";
import { useState } from "react";
import { CLUB_CATEGORY_META } from "@/lib/clubCategories";

type RecItem = {
  score: number;
  reason: string;
  club: {
    id: string;
    name: string;
    category: string;
    description: string;
    tags: string;
    maxMembers: number | null;
    memberCount: number;
  };
};

type State = "idle" | "loading" | "done" | "error";

export function ClubRecommendations({ reportId, shareSlug }: { reportId: string; shareSlug: string }) {
  const [state, setState] = useState<State>("idle");
  const [items, setItems] = useState<RecItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [needLogin, setNeedLogin] = useState(false);

  async function getRecommendations() {
    setState("loading");
    setError(null);
    setNeedLogin(false);
    try {
      const res = await fetch("/api/clubs/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId }),
      });
      if (res.status === 401) {
        setNeedLogin(true);
        setError("로그인하면 내 성향에 맞는 동아리를 추천받을 수 있어요.");
        setState("error");
        return;
      }
      const data = await res.json();
      if (res.status === 404) {
        setError("본인이 만든 성향 카드에서만 추천을 받을 수 있어요.");
        setState("error");
        return;
      }
      if (!data.ok) {
        setError(data.error ?? "추천 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
        setState("error");
        return;
      }
      setItems(data.items ?? []);
      setState("done");
    } catch {
      setError("네트워크 오류. 잠시 후 다시 시도해주세요.");
      setState("error");
    }
  }

  /* ── 로딩 ── */
  if (state === "loading") {
    return (
      <div className="glass-card p-8 text-center">
        <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-teal/25 border-t-teal-deep" />
        <p className="text-sm text-ink">AI가 어울리는 동아리를 찾고 있어요...</p>
        <p className="mt-1 text-xs text-ink-faint">잠시만 기다려주세요</p>
      </div>
    );
  }

  /* ── 에러 ── */
  if (state === "error") {
    return (
      <div className="glass-card p-6 text-center">
        <p className="mb-4 text-sm text-ink-soft">{error}</p>
        {needLogin ? (
          <Link
            href={`/login?next=/report/${shareSlug}`}
            className="btn-gold inline-block rounded-full px-6 py-2.5 text-sm"
          >
            로그인
          </Link>
        ) : (
          <button
            onClick={getRecommendations}
            className="glass-soft rounded-full px-6 py-2.5 text-sm text-ink-soft transition-all hover:bg-white/90 hover:text-ink"
          >
            다시 시도
          </button>
        )}
      </div>
    );
  }

  /* ── 결과: 동아리 없음 ── */
  if (state === "done" && items.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="mb-3 text-3xl">🌱</div>
        <p className="mb-1 text-sm text-ink">아직 추천할 동아리가 충분하지 않아요.</p>
        <p className="mb-5 text-xs text-ink-faint">첫 번째 동아리를 직접 개설하거나 둘러보세요.</p>
        <div className="flex justify-center gap-3">
          <Link
            href="/clubs"
            className="glass-soft rounded-full px-5 py-2.5 text-sm text-ink-soft transition-all hover:bg-white/90 hover:text-ink"
          >
            동아리 둘러보기
          </Link>
          <Link
            href="/clubs/new"
            className="btn-gold rounded-full px-5 py-2.5 text-sm"
          >
            + 동아리 개설
          </Link>
        </div>
      </div>
    );
  }

  /* ── 결과: 목록 ── */
  if (state === "done") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-ink">
            🎯 나와 잘 맞는 동아리 TOP {items.length}
          </h2>
          <button
            onClick={getRecommendations}
            className="text-xs text-ink-faint transition-colors hover:text-teal-ink"
          >
            다시 추천받기
          </button>
        </div>
        {items.map((item, i) => {
          const tags = item.club.tags.split(/[,，、]/).map((t) => t.trim()).filter(Boolean).slice(0, 4);
          return (
            <Link
              key={item.club.id}
              href={`/clubs/${item.club.id}`}
              className="glass-card group block p-5 transition-all card-glow"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-xs font-bold text-gold-ink">#{i + 1}</span>
                  <span className="text-lg">{CLUB_CATEGORY_META[item.club.category]?.emoji ?? "✨"}</span>
                  <h3 className="min-w-0 truncate font-semibold text-ink group-hover:text-teal-ink">
                    {item.club.name}
                  </h3>
                </div>
                <span className="shrink-0 rounded-full border border-gold/35 bg-gold/10 px-2.5 py-1 text-xs font-semibold text-gold-ink">
                  {Math.round(item.score)}%
                </span>
              </div>
              <div className="glass-soft mb-3 rounded-xl px-3 py-2.5">
                <p className="text-xs leading-relaxed text-ink-soft">
                  <span className="font-medium text-ink">AI </span>
                  {item.reason}
                </p>
              </div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="glass-soft rounded-full px-2 py-0.5 text-xs text-ink-soft">
                  {item.club.category}
                </span>
                <span className="text-xs text-ink-faint">
                  멤버 {item.club.memberCount}{item.club.maxMembers ? `/${item.club.maxMembers}` : ""}명
                </span>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t, ti) => (
                    <span key={ti} className="rounded-full border border-sky-line bg-white/55 px-2 py-0.5 text-xs text-ink-faint">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    );
  }

  /* ── idle ── */
  return (
    <div className="glass-card relative overflow-hidden p-6 text-center">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 h-32 w-72 rounded-full bg-teal/15 blur-[60px]" />
      </div>
      <p className="relative mb-1 text-base font-semibold text-ink">나와 맞는 동아리는?</p>
      <p className="relative mb-5 text-sm text-ink-soft">AI가 내 기질·역할에 어울리는 동아리를 추천해드려요.</p>
      <button
        onClick={getRecommendations}
        className="btn-gold relative inline-block rounded-full px-7 py-3 text-sm"
      >
        🎯 동아리 추천 받기
      </button>
    </div>
  );
}
