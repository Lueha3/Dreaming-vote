"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { fetchJson } from "@/lib/http";
import { CLUB_CATEGORIES, CLUB_CATEGORY_META } from "@/lib/clubCategories";
import { ClubCategoryIcon } from "@/components/icons";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";

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
  imageUrl: string | null;
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
    <div className="relative min-h-screen overflow-hidden">
      <main className="relative mx-auto max-w-4xl px-4 py-12">
        {/* 전체 공지 배너 */}
        <AnnouncementBanner />

        {/* 헤더 */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link
              href="/"
              className="text-xs font-medium text-ink-faint transition-colors hover:text-skyx-ink"
            >
              ← 홈
            </Link>
            <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-ink">동아리 둘러보기</h1>
            <p className="mt-1.5 text-sm text-ink-soft">
              관심사가 맞는 사람들과 함께할 동아리를 찾아보세요.
            </p>
          </div>
          <Link
            href="/clubs/new"
            className="btn-gold shrink-0 rounded-full px-5 py-2.5 text-sm"
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
            className="w-full rounded-xl border border-white/95 bg-white/70 px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-teal focus:outline-none"
          />
        </div>

        {/* 카테고리 필터 */}
        <div className="mb-7 flex flex-wrap gap-2">
          <button
            onClick={() => setCategory("")}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
              category === ""
                ? "bg-teal/15 text-teal-ink ring-1 ring-teal/40"
                : "glass-soft text-ink-soft hover:bg-white/90 hover:text-ink"
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
                    ? "bg-teal/15 text-teal-ink ring-1 ring-teal/40"
                    : "glass-soft text-ink-soft hover:bg-white/90 hover:text-ink"
                }`}
              >
                <ClubCategoryIcon category={cat} tone="inherit" className="h-4 w-4" />
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
                className="glass-card animate-pulse p-5"
              >
                <div className="mb-3 h-5 w-32 rounded bg-white/55" />
                <div className="mb-2 h-3 w-full rounded bg-white/55" />
                <div className="h-3 w-3/4 rounded bg-white/55" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="glass-card px-8 py-16 text-center">
            <div className="mb-3 text-4xl">🔍</div>
            <p className="mb-1 text-ink">
              {debouncedQuery || category
                ? "조건에 맞는 동아리가 없어요."
                : "아직 등록된 동아리가 없어요."}
            </p>
            <p className="mb-6 text-sm text-ink-soft">첫 번째 동아리를 개설해보세요!</p>
            <Link
              href="/clubs/new"
              className="btn-gold inline-block rounded-full px-5 py-2.5 text-sm"
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
                    className="group block h-full overflow-hidden glass-card transition-all hover:border-teal/40 hover:bg-white/90 card-glow"
                  >
                    {club.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={club.imageUrl}
                        alt=""
                        className="aspect-[2/1] w-full object-cover"
                      />
                    ) : (
                      <div
                        className={`flex aspect-[2/1] w-full items-center justify-center bg-gradient-to-br ${
                          CLUB_CATEGORY_META[club.category]?.gradient ?? "from-skyx/30 to-teal/15"
                        }`}
                      >
                        <ClubCategoryIcon category={club.category} className="h-9 w-9" />
                      </div>
                    )}

                    <div className="p-5">
                      <div className="mb-2 flex items-center gap-2">
                        <ClubCategoryIcon category={club.category} className="h-[18px] w-[18px] shrink-0" />
                        <h3 className="min-w-0 flex-1 truncate font-semibold text-ink group-hover:text-teal-ink">
                          {club.name}
                        </h3>
                      </div>

                      <span className="glass-soft mb-2 inline-block rounded-full px-2 py-0.5 text-xs text-ink-soft">
                        {club.category}
                      </span>

                      <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-ink-soft">
                        {club.description}
                      </p>

                      {tags.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-1.5">
                          {tags.map((t, i) => (
                            <span
                              key={i}
                              className="rounded-full border border-gold/35 bg-gold/10 px-2 py-0.5 text-xs text-gold-ink"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-xs text-ink-faint">
                        <span>
                          멤버 {club.memberCount}
                          {club.maxMembers ? `/${club.maxMembers}` : ""}명
                        </span>
                        <span>·</span>
                        <span>조회 {club.viewCount}</span>
                      </div>
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
