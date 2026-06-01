"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { fetchJson } from "@/lib/http";
import { CLUB_CATEGORIES, CLUB_CATEGORY_META } from "@/lib/clubCategories";

type ClubItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string;
  maxMembers: number | null;
  viewCount: number;
  createdAt: string;
  memberCount: number;
};

function splitTags(tags: string): string[] {
  return tags
    .split(/[,，、]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export default function ClubsPage() {
  const [items, setItems] = useState<ClubItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // 검색어 디바운스
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (category) sp.set("category", category);
      if (debouncedQuery) sp.set("q", debouncedQuery);
      const qs = sp.toString();
      const data = await fetchJson<{ ok: true; items: ClubItem[] }>(
        `/api/clubs${qs ? `?${qs}` : ""}`,
      );
      setItems(data.items ?? []);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, [category, debouncedQuery]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="relative min-h-screen bg-[#09090b] text-white overflow-hidden">
      <AmbientGlow />

      <main className="relative mx-auto max-w-4xl px-4 py-12">
        {/* 헤더 */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link
              href="/"
              className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
            >
              ← 홈
            </Link>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">동아리 둘러보기</h1>
            <p className="mt-1.5 text-sm text-zinc-500">
              관심사가 맞는 사람들과 함께할 동아리를 찾아보세요.
            </p>
          </div>
          <Link
            href="/clubs/new"
            className="shrink-0 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 btn-glow"
          >
            + 동아리 개설
          </Link>
        </div>

        {/* 검색 */}
        <div className="mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름, 소개, 키워드로 검색..."
            className="w-full rounded-xl border border-white/[0.07] bg-[#141418] px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
          />
        </div>

        {/* 카테고리 필터 */}
        <div className="mb-7 flex flex-wrap gap-2">
          <button
            onClick={() => setCategory("")}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
              category === ""
                ? "bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/40"
                : "bg-white/5 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            전체
          </button>
          {CLUB_CATEGORIES.map((cat) => {
            const active = category === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/40"
                    : "bg-white/5 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span>{CLUB_CATEGORY_META[cat]?.emoji}</span>
                <span>{cat}</span>
              </button>
            );
          })}
        </div>

        {/* 목록 */}
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-white/[0.07] bg-[#141418] p-5"
              >
                <div className="mb-3 h-5 w-32 rounded bg-white/5" />
                <div className="mb-2 h-3 w-full rounded bg-white/5" />
                <div className="h-3 w-3/4 rounded bg-white/5" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.07] bg-[#141418] px-8 py-16 text-center">
            <div className="mb-3 text-4xl">🔍</div>
            <p className="mb-1 text-zinc-300">
              {debouncedQuery || category
                ? "조건에 맞는 동아리가 없습니다."
                : "아직 등록된 동아리가 없습니다."}
            </p>
            <p className="mb-6 text-sm text-zinc-500">첫 번째 동아리를 개설해보세요!</p>
            <Link
              href="/clubs/new"
              className="inline-block rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 btn-glow"
            >
              + 동아리 개설
            </Link>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {items.map((club) => {
              const tags = splitTags(club.tags).slice(0, 4);
              return (
                <li key={club.id}>
                  <Link
                    href={`/clubs/${club.id}`}
                    className="group block h-full rounded-2xl border border-white/[0.07] bg-[#141418] p-5 transition-all hover:border-violet-500/30 hover:bg-[#17171c] card-glow"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-lg">
                        {CLUB_CATEGORY_META[club.category]?.emoji ?? "✨"}
                      </span>
                      <h3 className="min-w-0 flex-1 truncate font-semibold text-white group-hover:text-violet-200">
                        {club.name}
                      </h3>
                    </div>

                    <span className="mb-2 inline-block rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-zinc-400">
                      {club.category}
                    </span>

                    <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-zinc-400">
                      {club.description}
                    </p>

                    {tags.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {tags.map((t, i) => (
                          <span
                            key={i}
                            className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-xs text-violet-300"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-xs text-zinc-600">
                      <span>
                        멤버 {club.memberCount}
                        {club.maxMembers ? `/${club.maxMembers}` : ""}명
                      </span>
                      <span>·</span>
                      <span>조회 {club.viewCount}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}

function AmbientGlow() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full bg-violet-600/8 blur-[120px]" />
      <div className="absolute top-1/2 -left-24 w-[300px] h-[300px] rounded-full bg-blue-600/6 blur-[100px]" />
    </div>
  );
}
