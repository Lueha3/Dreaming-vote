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

export function ClubRecommendations({
  reportId,
  shareSlug,
}: {
  reportId: string;
  shareSlug: string;
}) {
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
        setError("로그인하면 내 페르소나에 맞는 동아리를 추천받을 수 있어요.");
        setState("error");
        return;
      }

      const data = await res.json();

      if (res.status === 404) {
        setError("본인이 만든 리포트에서만 추천을 받을 수 있어요.");
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

  /* ── 로딩 ──────────────────────────────────────────────────── */
  if (state === "loading") {
    return (
      <div className="rounded-2xl border border-violet-500/20 bg-[#141418] p-8 text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-violet-500/30 border-t-violet-400" />
        <p className="text-sm font-medium text-zinc-300">
          AI가 어울리는 동아리를 찾고 있어요...
        </p>
        <p className="mt-1 text-xs text-zinc-600">잠시만 기다려주세요 (최대 10초)</p>
      </div>
    );
  }

  /* ── 에러 ──────────────────────────────────────────────────── */
  if (state === "error") {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-[#141418] p-6 text-center">
        <div className="mb-3 text-3xl">🤔</div>
        <p className="mb-4 text-sm text-zinc-400">{error}</p>
        {needLogin ? (
          <Link
            href={`/api/auth/login?next=/report/${shareSlug}`}
            className="inline-block rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 btn-glow"
          >
            카카오로 로그인
          </Link>
        ) : (
          <button
            onClick={getRecommendations}
            className="inline-block rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-medium text-zinc-300 transition-all hover:border-white/20 hover:text-white"
          >
            다시 시도
          </button>
        )}
      </div>
    );
  }

  /* ── 결과 ──────────────────────────────────────────────────── */
  if (state === "done") {
    if (items.length === 0) {
      return (
        <div className="rounded-2xl border border-white/[0.07] bg-[#141418] p-8 text-center">
          <div className="mb-3 text-3xl">🌱</div>
          <p className="mb-1 text-sm text-zinc-300">아직 추천할 동아리가 충분하지 않아요.</p>
          <p className="mb-5 text-xs text-zinc-600">
            첫 번째 동아리를 직접 개설하거나 둘러보세요.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/clubs"
              className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-zinc-300 transition-all hover:border-white/20 hover:text-white"
            >
              동아리 둘러보기
            </Link>
            <Link
              href="/clubs/new"
              className="rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 btn-glow"
            >
              + 동아리 개설
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <span>🎯</span> 나와 잘 맞는 동아리 TOP {items.length}
          </h2>
          <button
            onClick={getRecommendations}
            className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            다시 추천받기
          </button>
        </div>

        {items.map((item, i) => {
          const tags = item.club.tags
            .split(/[,，、]/)
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 4);
          return (
            <Link
              key={item.club.id}
              href={`/clubs/${item.club.id}`}
              className="group block rounded-2xl border border-white/[0.07] bg-[#141418] p-5 transition-all hover:border-violet-500/30 hover:bg-[#17171c] card-glow"
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-xs font-bold text-violet-400">#{i + 1}</span>
                  <span className="text-lg">
                    {CLUB_CATEGORY_META[item.club.category]?.emoji ?? "✨"}
                  </span>
                  <h3 className="min-w-0 truncate font-semibold text-white group-hover:text-violet-200">
                    {item.club.name}
                  </h3>
                </div>
                <span className="shrink-0 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-300">
                  매칭 {Math.round(item.score)}%
                </span>
              </div>

              {/* AI 추천 이유 */}
              <div className="mb-3 rounded-xl border border-violet-500/15 bg-violet-500/[0.06] px-3 py-2.5">
                <p className="text-xs leading-relaxed text-violet-200/90">
                  <span className="font-semibold text-violet-300">AI </span>
                  {item.reason}
                </p>
              </div>

              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-zinc-400">
                  {item.club.category}
                </span>
                <span className="text-xs text-zinc-600">
                  멤버 {item.club.memberCount}
                  {item.club.maxMembers ? `/${item.club.maxMembers}` : ""}명
                </span>
              </div>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t, ti) => (
                    <span
                      key={ti}
                      className="rounded-full border border-white/[0.06] bg-black/30 px-2 py-0.5 text-xs text-zinc-500"
                    >
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

  /* ── idle: 추천 받기 버튼 ──────────────────────────────────── */
  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-[#141418] p-6 text-center">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 h-32 w-72 rounded-full bg-violet-600/15 blur-[60px]" />
      </div>
      <p className="relative mb-1 text-base font-semibold text-white">
        이 페르소나에 맞는 동아리는?
      </p>
      <p className="relative mb-5 text-sm text-zinc-500">
        AI가 내 기질·역할에 어울리는 동아리를 추천해드려요.
      </p>
      <button
        onClick={getRecommendations}
        className="relative inline-block rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-7 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 btn-glow"
      >
        🎯 동아리 추천 받기
      </button>
    </div>
  );
}
