"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, fetchJson } from "@/lib/http";
import { NewcomerBadge } from "@/components/NewcomerBadge";

type Person = {
  id: string;
  nickname: string | null;
  avatarUrl: string | null;
  age: number | null;
  group: string | null;
  dreamGroup: string | null;
  isNewcomer: boolean;
  catchphrase: string | null;
  clubCount: number;
};

type SortKey = "name" | "age";
type SortDir = "asc" | "desc";

const CHOSEONG = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const isChoseongQuery = (q: string) => q.length > 0 && [...q].every((ch) => CHOSEONG.includes(ch));
// "김건영" → "ㄱㄱㅇ" (한글 음절이 아닌 글자는 그대로 둔다)
const toChoseong = (s: string) =>
  [...s]
    .map((ch) => {
      const c = ch.charCodeAt(0) - 0xac00;
      return c >= 0 && c <= 11171 ? CHOSEONG[Math.floor(c / 588)] : ch;
    })
    .join("");

// 닉네임이 "집단-나이-이름" 형식이라 이름은 마지막 하이픈 뒤 조각이다.
const nameOf = (p: Person) => (p.nickname ? p.nickname.split("-").pop()! : "");

function byName(a: Person, b: Person) {
  // 닉네임이 없는 행은 방향과 상관없이 맨 뒤로 가도록 호출부에서 처리한다.
  return nameOf(a).localeCompare(nameOf(b), "ko") || (a.nickname ?? "").localeCompare(b.nickname ?? "", "ko");
}

/**
 * 멤버 둘러보기 — 승인 멤버만. 검색(이름·꿈터, 초성 "ㄱㄱㅇ"도 가능)과
 * 이름순/나이순 정렬은 이미 받아온 목록 위에서 클라이언트가 처리한다.
 * 정렬 버튼을 한 번 더 누르면 방향(오름/내림)이 바뀐다.
 */
export default function PeoplePage() {
  const [items, setItems] = useState<Person[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [needJoin, setNeedJoin] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "name", dir: "asc" });

  const q = query.trim().replace(/\s+/g, "");
  const visible = useMemo(() => {
    if (!items) return [];
    const choseong = isChoseongQuery(q);
    const needle = q.toLowerCase();
    const matched = !q
      ? items
      : items.filter((p) => {
          if (choseong) return toChoseong(nameOf(p)).includes(q);
          return [p.nickname, p.dreamGroup].some((f) => f?.replace(/\s+/g, "").toLowerCase().includes(needle));
        });
    const sign = sort.dir === "asc" ? 1 : -1;
    return [...matched].sort((a, b) => {
      // 비어 있는 값(닉네임/나이 없음)은 방향과 무관하게 항상 맨 뒤
      if (sort.key === "age") {
        if (a.age == null || b.age == null) return a.age == null ? (b.age == null ? byName(a, b) : 1) : -1;
        return sign * (a.age - b.age) || byName(a, b);
      }
      if (!a.nickname || !b.nickname) return !a.nickname ? (!b.nickname ? 0 : 1) : -1;
      return sign * byName(a, b);
    });
  }, [items, q, sort]);

  function pickSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  const load = useCallback(async () => {
    setLoading(true);
    setNeedJoin(false);
    try {
      const data = await fetchJson<{ ok: true; items: Person[] }>("/api/people");
      setItems(data.items ?? []);
    } catch (e) {
      if (e instanceof ApiError && e.code === "membership_required") setNeedJoin(true);
      setItems([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (needJoin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-14 text-center">
        <div className="glass-card p-8">
          <div className="mb-3 text-3xl">🧑‍🤝‍🧑</div>
          <p className="mb-1.5 text-base font-bold text-ink">멤버 둘러보기는 승인 멤버만 볼 수 있어요</p>
          <p className="mb-5 text-sm leading-relaxed text-ink-soft">
            가입 승인을 받으면 청년부 멤버들을 둘러볼 수 있어요.
          </p>
          <Link href="/join" className="btn-gold btn-glow inline-block rounded-full px-6 py-3 text-sm font-bold">
            가입 신청하러 가기 →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="mb-1.5 text-2xl font-extrabold text-ink">
            <span className="gradient-text">멤버 둘러보기</span>
          </h1>
          <p className="text-sm text-ink-soft">우리 청년부 멤버들을 둘러보세요.</p>
        </div>
        {items && items.length > 0 && (
          <span className="glass-soft shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-ink-soft tabular-nums">
            {q ? (
              <>
                <span className="text-teal-ink">{visible.length}</span> / {items.length}명
              </>
            ) : (
              <>총 {items.length}명</>
            )}
          </span>
        )}
      </div>

      {items && items.length > 0 && (
        <div className="sticky top-[4.25rem] z-20 mb-4 flex items-center gap-2">
          <label className="glass-soft group flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full pl-4 pr-1.5 shadow-[0_8px_24px_-12px_rgba(74,144,194,0.45)] transition focus-within:border-teal/60 focus-within:shadow-[0_0_0_3px_rgba(53,195,180,0.18)]"
            style={{ background: "rgba(255,255,255,.86)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" className="h-4 w-4 shrink-0 text-ink-faint transition-colors group-focus-within:text-teal-deep" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setQuery("");
                if (e.key === "Enter") e.currentTarget.blur(); // 모바일 키보드 내리기
              }}
              placeholder="이름·초성·꿈터로 검색"
              aria-label="멤버 검색"
              className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="검색어 지우기"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink/10 text-ink-soft transition hover:bg-ink/15"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" className="h-3 w-3" aria-hidden>
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            )}
          </label>

          <div role="group" aria-label="정렬" className="glass-soft relative flex h-11 shrink-0 items-center rounded-full p-1 shadow-[0_8px_24px_-12px_rgba(74,144,194,0.45)]"
            style={{ background: "rgba(255,255,255,.86)" }}
          >
            {/* 선택된 쪽 뒤로 미끄러지는 골드→틸 알약 */}
            <span
              aria-hidden
              className="btn-gold absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full transition-transform duration-300 ease-[cubic-bezier(.3,1.4,.5,1)]"
              style={{ transform: sort.key === "age" ? "translateX(100%)" : "none" }}
            />
            {(["name", "age"] as const).map((key) => {
              const active = sort.key === key;
              const label = key === "name" ? "이름" : "나이";
              const dirText = key === "name" ? (sort.dir === "asc" ? "가나다순" : "역순") : sort.dir === "asc" ? "어린 순" : "많은 순";
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => pickSort(key)}
                  aria-pressed={active}
                  aria-label={active ? `${label} ${dirText} (누르면 방향 전환)` : `${label}순 정렬`}
                  title={active ? `${dirText} · 한 번 더 누르면 반대로` : `${label}순`}
                  className={`relative z-10 flex h-full w-[4.25rem] items-center justify-center gap-0.5 rounded-full text-xs font-bold transition-colors ${
                    active ? "text-[#3A2A02]" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {label}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`h-3 w-3 transition-all duration-300 ${active ? "opacity-100" : "opacity-0"} ${
                      active && sort.dir === "desc" ? "rotate-180" : ""
                    }`}
                    aria-hidden
                  >
                    <path d="M12 19V5M6 11l6-6 6 6" />
                  </svg>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card h-28 animate-pulse p-5" />
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <div className="glass-card px-8 py-14 text-center text-sm text-ink-soft">
          아직 표시할 멤버가 없어요.
        </div>
      ) : visible.length === 0 ? (
        <div className="glass-card px-8 py-14 text-center">
          <div className="mb-2 text-3xl">🔍</div>
          <p className="mb-1 text-sm font-bold text-ink">&lsquo;{query.trim()}&rsquo;에 맞는 멤버가 없어요</p>
          <p className="mb-4 text-xs text-ink-soft">이름 일부나 초성(예: ㄱㄱㅇ)으로도 찾을 수 있어요.</p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="glass-soft rounded-full px-4 py-2 text-xs font-semibold text-ink-soft transition hover:text-ink"
          >
            검색어 지우기
          </button>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {visible.map((p) => (
            <li key={p.id} className="glass-card p-4">
              <div className="mb-2 flex items-center gap-2.5">
                {p.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img loading="lazy" decoding="async" src={p.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-skyx/20 text-sm text-skyx-ink">
                    {p.nickname?.[0] ?? "?"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{p.nickname ?? "멤버"}</p>
                  <div className="flex flex-wrap items-center gap-1 text-xs text-ink-faint">
                    {p.group && <span>{p.group}</span>}
                    {p.dreamGroup && <span>· {p.dreamGroup}</span>}
                  </div>
                </div>
                {p.isNewcomer && <NewcomerBadge size="sm" />}
              </div>
              {p.catchphrase && (
                <p className="mb-2 line-clamp-2 text-xs leading-relaxed text-ink-soft">
                  &ldquo;{p.catchphrase}&rdquo;
                </p>
              )}
              <p className="text-[11px] text-ink-faint">가입 동아리 {p.clubCount}개</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
