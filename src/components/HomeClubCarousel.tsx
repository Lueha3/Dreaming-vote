"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { CLUB_CATEGORY_META, CLUB_COVER_FALLBACK } from "@/lib/clubCategories";
import { ClubCategoryIcon } from "@/components/icons";
import { HomeSectionHeader } from "@/components/HomeSectionHeader";
import { triggerHaptic } from "@/lib/haptics";
import type { FeedData } from "@/lib/feed";

type ClubSlide = FeedData["recentClubs"][number];
type Item =
  | { kind: "club"; club: ClubSlide; realIndex: number; accent: string }
  | { kind: "more"; total: number; accent: string };

// 자동 넘김 간격.
const AUTOPLAY_MS = 2000;
// 사용자가 만지면 자동 재생을 멈췄다 이 시간 뒤 재개.
const RESUME_AFTER_MS = 4000;

function accentOf(category: string): string {
  return CLUB_CATEGORY_META[category]?.accent ?? CLUB_COVER_FALLBACK.accent;
}
function coverOf(category: string): string {
  return CLUB_CATEGORY_META[category]?.cover ?? CLUB_COVER_FALLBACK.cover;
}
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * 홈 대문 캐러셀 — '새로 생긴 동아리'를 올리브영 메인 배너 문법으로.
 * 풀블리드(양옆 peek)·세로형 카드 + 하단 스크림 위 흰 락업 + 'NN | 전체 +' 카운터.
 *
 * 동작(올리브영 벤치마킹):
 *  - 중앙 카드 포커싱 — 가운데로 올수록 크고 선명, 양옆은 작고 흐리게(스크롤 위치로 실시간 보간).
 *  - 무한 순환 — 양 끝에 클론을 두고, 스크롤이 멎으면 대응하는 실제 카드로 순간 이동한다
 *    (클론과 실제가 픽셀 동일이라 사용자는 못 느낌). 시작·끝에서 끊기지 않는다.
 *  - 자동 재생(2초) + 손대면 멈춤(4초 뒤 재개). 화면 밖·탭 숨김·모션 최소화면 정지.
 *  - 활성 슬라이드 accent 색이 상단 배경으로 번지는 앰비언트 글로우.
 */
export function HomeClubCarousel({ clubs, total }: { clubs: ClubSlide[]; total: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const carRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const pointerDownRef = useRef(false);
  const [ready, setReady] = useState(false);

  const shown = clubs.length;
  const hasMore = total > shown;

  // 기본 시퀀스: 동아리들 + (실은 수보다 많으면) '전체 보기' 카드.
  const base: Item[] = clubs.map((club, i) => ({
    kind: "club",
    club,
    realIndex: i,
    accent: accentOf(club.category),
  }));
  if (hasMore) base.push({ kind: "more", total, accent: CLUB_COVER_FALLBACK.accent });

  const n = base.length;
  const loop = n >= 2; // 2개 이상일 때만 무한 순환.
  const K = loop ? Math.min(3, n) : 0; // 양 끝 클론 개수.
  const rendered: Item[] = loop
    ? [...base.slice(n - K), ...base, ...base.slice(0, K)]
    : base;
  const realStart = K;
  const initialAccent = rendered[realStart]?.accent ?? CLUB_COVER_FALLBACK.accent;

  // 중앙 추적(accent·인덱스·포커싱) + 무한 순환 순간이동 + 초기 위치.
  useEffect(() => {
    const el = carRef.current;
    const wrap = wrapRef.current;
    if (!el || !wrap) return;
    const kids = () => Array.from(el.children) as HTMLElement[];
    const midOf = (c: HTMLElement) => c.offsetLeft + c.offsetWidth / 2;

    const nearest = () => {
      const center = el.scrollLeft + el.clientWidth / 2;
      let bi = 0;
      let bd = Infinity;
      kids().forEach((c, i) => {
        const d = Math.abs(midOf(c) - center);
        if (d < bd) {
          bd = d;
          bi = i;
        }
      });
      return bi;
    };

    // 포커싱 — 중앙이면 scale 1·불투명, 한 칸 벗어나면 0.87·0.55로.
    const applyFocus = () => {
      const center = el.scrollLeft + el.clientWidth / 2;
      kids().forEach((c) => {
        const d = Math.min(Math.abs(midOf(c) - center) / c.offsetWidth, 1);
        c.style.transform = `scale(${(1 - 0.13 * d).toFixed(3)})`;
        c.style.opacity = (1 - 0.45 * d).toFixed(3);
      });
    };

    let raf = 0;
    const onFrame = () => {
      raf = 0;
      indexRef.current = nearest();
      const a = kids()[indexRef.current]?.dataset.accent;
      if (a) wrap.style.setProperty("--hero-accent", a);
      applyFocus();
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(onFrame);
    };
    el.addEventListener("scroll", onScroll, { passive: true });

    // 초기 위치 — 실제 영역 첫 카드를 중앙에.
    if (loop) {
      const first = kids()[realStart];
      el.scrollLeft = first.offsetLeft - (el.clientWidth - first.offsetWidth) / 2;
    }
    applyFocus();
    const a0 = kids()[nearest()]?.dataset.accent;
    if (a0) wrap.style.setProperty("--hero-accent", a0);
    setReady(true);

    // 무한 순환 — 스크롤이 멎었을 때 클론 구간이면 대응 실제 카드로 순간이동(동일 픽셀 → 무감).
    let idleT = 0;
    const reposition = () => {
      if (!loop || pointerDownRef.current) return;
      const c = nearest();
      const list = kids();
      if (c < K) {
        el.scrollLeft += list[c + n].offsetLeft - list[c].offsetLeft;
      } else if (c >= K + n) {
        el.scrollLeft -= list[c].offsetLeft - list[c - n].offsetLeft;
      }
    };
    const onIdle = () => {
      window.clearTimeout(idleT);
      idleT = window.setTimeout(reposition, 140);
    };
    el.addEventListener("scroll", onIdle, { passive: true });

    // 드래그 중엔 순간이동 보류.
    const onDown = () => {
      pointerDownRef.current = true;
    };
    const onUp = () => {
      pointerDownRef.current = false;
    };
    el.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });

    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("scroll", onIdle);
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.clearTimeout(idleT);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [loop, K, n, realStart]);

  // 자동 재생 + 순환. 손대면 멈췄다 재개, 화면 밖/탭 숨김/모션 최소화면 정지.
  useEffect(() => {
    const el = carRef.current;
    if (!el) return;
    const count = el.children.length;
    if (count <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let timer = 0;
    let resume = 0;
    let paused = false;
    let onScreen = true;

    const goTo = (i: number) => {
      const t = el.children[i] as HTMLElement | undefined;
      t?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    };
    const tick = () => {
      if (paused || !onScreen || document.hidden) return;
      let next = indexRef.current + 1;
      if (next >= count) next = 0;
      goTo(next);
    };
    const start = () => {
      stop();
      timer = window.setInterval(tick, AUTOPLAY_MS);
    };
    const stop = () => {
      if (timer) window.clearInterval(timer);
      timer = 0;
    };
    const pauseForUser = () => {
      paused = true;
      stop();
      if (resume) window.clearTimeout(resume);
      resume = window.setTimeout(() => {
        paused = false;
        start();
      }, RESUME_AFTER_MS);
    };
    el.addEventListener("pointerdown", pauseForUser, { passive: true });
    el.addEventListener("wheel", pauseForUser, { passive: true });

    const onVis = () => {
      if (document.hidden) stop();
      else if (!paused && onScreen) start();
    };
    document.addEventListener("visibilitychange", onVis);

    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        if (onScreen && !paused) start();
        else stop();
      },
      { threshold: 0.35 },
    );
    io.observe(el);

    start();
    return () => {
      stop();
      if (resume) window.clearTimeout(resume);
      el.removeEventListener("pointerdown", pauseForUser);
      el.removeEventListener("wheel", pauseForUser);
      document.removeEventListener("visibilitychange", onVis);
      io.disconnect();
    };
  }, [n]);

  if (!shown) return null;

  return (
    <div
      ref={wrapRef}
      className="relative"
      style={{ "--hero-accent": initialAccent } as CSSProperties}
    >
      {/* 앰비언트 글로우 — 활성 슬라이드 색이 상단 배경으로 번진다(콘텐츠 뒤, 클릭 방해 없음). */}
      <span
        aria-hidden
        className="home-ambient-glow pointer-events-none absolute -top-8 left-1/2 -z-0 h-[300px] w-[132%] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(60% 55% at 50% 32%, color-mix(in srgb, var(--hero-accent, #4A90C2) 32%, transparent), transparent 72%)",
        }}
      />

      <div className="relative z-10">
        <HomeSectionHeader
          kicker="New Clubs"
          title="새로 생긴 동아리"
          actionHref="/clubs"
          actionLabel="전체 보기"
          className="mb-3 px-1"
        />

        <div
          ref={carRef}
          className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
          style={{
            scrollbarWidth: "none",
            scrollPaddingLeft: "1rem",
            scrollPaddingRight: "1rem",
            opacity: ready ? 1 : 0,
            transition: "opacity 0.25s ease",
          }}
        >
          {rendered.map((it, p) => {
            const isClone = loop && (p < K || p >= K + n);
            const cloneProps = isClone ? { "aria-hidden": true, tabIndex: -1 } : {};
            const slideCls =
              "relative aspect-[4/5] w-[84%] shrink-0 snap-center overflow-hidden rounded-[30px] sm:w-[47%]";

            if (it.kind === "more") {
              return (
                <Link
                  key={p}
                  href="/clubs"
                  onClick={() => triggerHaptic()}
                  data-accent={it.accent}
                  {...cloneProps}
                  className={`${slideCls} grid place-items-center border border-white/70 bg-white/55`}
                >
                  <span className="px-4 text-center">
                    <span className="block text-[15px] font-extrabold text-ink">
                      전체 {it.total}개 동아리
                    </span>
                    <span className="mt-1 block text-[12px] text-ink-soft">모두 둘러보기</span>
                    <span className="mx-auto mt-3 grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-gold to-teal text-[#2B2103]">
                      →
                    </span>
                  </span>
                </Link>
              );
            }

            const c = it.club;
            return (
              <Link
                key={p}
                href={`/clubs/${c.id}`}
                onClick={() => triggerHaptic()}
                data-accent={it.accent}
                {...cloneProps}
                className={slideCls}
              >
                {/* 커버: 카드뉴스 첫 장 or 카테고리 딥 그라데이션 폴백(+아이콘 워터마크) */}
                {c.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.imageUrl}
                    alt=""
                    loading={it.realIndex === 0 ? "eager" : "lazy"}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <span aria-hidden className="absolute inset-0" style={{ background: coverOf(c.category) }}>
                    <span className="absolute inset-0 grid place-items-center pb-16">
                      <ClubCategoryIcon
                        category={c.category}
                        tone="inherit"
                        className="h-16 w-16 text-white/30"
                      />
                    </span>
                  </span>
                )}

                {/* 스크림 — 어떤 사진에서도 흰 글씨 대비 확보 */}
                <span
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(180deg,rgba(8,18,28,.12) 0%,rgba(8,18,28,0) 26%,rgba(8,18,28,0) 40%,rgba(8,18,28,.72) 100%)",
                  }}
                />
                <span
                  aria-hidden
                  className="absolute inset-0"
                  style={{ boxShadow: "inset 0 0 70px rgba(10,25,40,.26)" }}
                />

                {/* NEW 칩 — 가장 최근 1건 */}
                {it.realIndex === 0 && (
                  <span className="absolute left-4 top-4 rounded-full bg-gradient-to-r from-gold to-teal px-2.5 py-1 text-[10px] font-extrabold tracking-[0.06em] text-[#2B2103]">
                    NEW
                  </span>
                )}
                {!c.imageUrl && (
                  <span className="absolute right-4 top-4 rounded-full border border-white/35 bg-[#0F1E2D]/35 px-2 py-0.5 text-[9px] font-semibold text-white/85 backdrop-blur-sm">
                    기본 커버
                  </span>
                )}

                {/* 흰 타이포 락업 — 이름 / 메타 / 카운터(올리브영식 'NN | 전체 +', 중앙) */}
                <span className="absolute inset-x-5 bottom-5 text-center">
                  <span className="line-clamp-2 block text-[21px] font-extrabold leading-tight tracking-tight text-white [text-shadow:0_2px_14px_rgba(0,0,0,.4)]">
                    {c.name}
                  </span>
                  <span className="mt-1 block truncate text-[11.5px] font-medium text-white/85 [text-shadow:0_1px_8px_rgba(0,0,0,.35)]">
                    {c.category}
                    {c.keyword ? ` · ${c.keyword}` : ""} · 멤버 {c.memberCount}
                  </span>
                  <span className="mt-2.5 inline-flex items-center gap-2 text-[12px] font-bold tabular-nums tracking-[0.08em] [text-shadow:0_1px_6px_rgba(0,0,0,.4)]">
                    <span className="text-white">{pad2(it.realIndex + 1)}</span>
                    <span className="font-normal text-white/35">|</span>
                    <span className="text-white/70">{pad2(shown)}</span>
                    {hasMore && (
                      <span className="ml-0.5 text-[16px] font-normal leading-none text-white/70">+</span>
                    )}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
