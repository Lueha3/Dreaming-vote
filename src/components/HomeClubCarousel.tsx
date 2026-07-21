"use client";

import Link from "next/link";
import { useEffect, useRef, type CSSProperties } from "react";
import { CLUB_CATEGORY_META, CLUB_COVER_FALLBACK } from "@/lib/clubCategories";
import { ClubCategoryIcon } from "@/components/icons";
import { HomeSectionHeader } from "@/components/HomeSectionHeader";
import { triggerHaptic } from "@/lib/haptics";
import type { FeedData } from "@/lib/feed";

type ClubSlide = FeedData["recentClubs"][number];

function accentOf(category: string): string {
  return CLUB_CATEGORY_META[category]?.accent ?? CLUB_COVER_FALLBACK.accent;
}
function coverOf(category: string): string {
  return CLUB_CATEGORY_META[category]?.cover ?? CLUB_COVER_FALLBACK.cover;
}
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// 자동 넘김 간격 — 올리브영식 자동 재생. 교회 앱이라 프랜틱하지 않게 4.5초.
const AUTOPLAY_MS = 4500;
// 사용자가 만지면 자동 재생을 잠시 멈췄다가 이 시간 뒤 재개.
const RESUME_AFTER_MS = 6000;

/**
 * 홈 대문 캐러셀 — '새로 생긴 동아리'를 올리브영 메인 배너 문법으로.
 * 풀블리드(양옆 peek)·세로형 이미지 카드 + 하단 스크림 위 흰 타이포 락업 + 'NN | 전체 +' 카운터.
 * 커버는 동아리 카드뉴스 첫 장(order 0), 없으면 카테고리 딥 그라데이션 폴백.
 *
 * 동작(올리브영 벤치마킹):
 *  - 자동 재생(4.5초) + 끝에서 처음으로 순환(loop). 부드러운 snap 슬라이드.
 *  - 손대면(터치/휠) 멈추고 6초 뒤 재개. 화면 밖·탭 숨김·모션 최소화 설정이면 멈춤.
 *  - 활성 슬라이드 accent 색이 상단 배경으로 번지는 앰비언트 글로우(중앙 카드 추적).
 * 최신 개설이 1번(왼쪽). 실은 수보다 동아리가 많으면 끝에 '전체 보기' 슬라이드.
 */
export function HomeClubCarousel({ clubs, total }: { clubs: ClubSlide[]; total: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const carRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const shown = clubs.length;
  const hasMore = total > shown;
  const initialAccent = shown ? accentOf(clubs[0].category) : CLUB_COVER_FALLBACK.accent;

  // 중앙에 가장 가까운 슬라이드를 추적 — accent 배경색 반영 + 현재 인덱스 갱신.
  // 리렌더 없이 DOM/ref에 직접 써 스크롤 중 churn을 피한다. rAF로 프레임당 1회.
  useEffect(() => {
    const el = carRef.current;
    const wrap = wrapRef.current;
    if (!el || !wrap) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const center = el.scrollLeft + el.clientWidth / 2;
      let bestIdx = 0;
      let bestDist = Infinity;
      const children = Array.from(el.children) as HTMLElement[];
      children.forEach((child, i) => {
        const mid = child.offsetLeft + child.offsetWidth / 2;
        const d = Math.abs(mid - center);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      });
      indexRef.current = bestIdx;
      const a = children[bestIdx]?.dataset.accent;
      if (a) wrap.style.setProperty("--hero-accent", a);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

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
      const target = el.children[i] as HTMLElement | undefined;
      target?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    };
    const tick = () => {
      if (paused || !onScreen || document.hidden) return;
      goTo((indexRef.current + 1) % count); // 끝 다음은 처음으로 순환
    };
    const start = () => {
      stop();
      timer = window.setInterval(tick, AUTOPLAY_MS);
    };
    const stop = () => {
      if (timer) window.clearInterval(timer);
      timer = 0;
    };
    // 사용자 조작(터치 드래그/휠) — 멈추고 잠시 뒤 재개.
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

    const onVisibility = () => {
      if (document.hidden) stop();
      else if (!paused && onScreen) start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // 화면 밖이면 자동 재생 정지(스크롤로 캐러셀이 안 보일 때 헛돌지 않게).
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
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
    };
  }, []);

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
          style={{ scrollbarWidth: "none", scrollPaddingLeft: "1rem", scrollPaddingRight: "1rem" }}
        >
          {clubs.map((c, i) => (
            <Link
              key={c.id}
              href={`/clubs/${c.id}`}
              onClick={() => triggerHaptic()}
              data-accent={accentOf(c.category)}
              className="home-slide relative aspect-[4/5] w-[84%] shrink-0 snap-center overflow-hidden rounded-[30px] sm:w-[47%]"
            >
              {/* 커버: 카드뉴스 첫 장 or 카테고리 딥 그라데이션 폴백(+아이콘 워터마크) */}
              {c.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.imageUrl}
                  alt=""
                  loading={i === 0 ? "eager" : "lazy"}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <span
                  aria-hidden
                  className="absolute inset-0"
                  style={{ background: coverOf(c.category) }}
                >
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
              {i === 0 && (
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
                  <span className="text-white">{pad2(i + 1)}</span>
                  <span className="font-normal text-white/35">|</span>
                  <span className="text-white/70">{pad2(shown)}</span>
                  {hasMore && (
                    <span className="ml-0.5 text-[16px] font-normal leading-none text-white/70">+</span>
                  )}
                </span>
              </span>
            </Link>
          ))}

          {/* 실은 수보다 동아리가 많으면 — 마지막에 '전체 보기' 슬라이드 */}
          {hasMore && (
            <Link
              href="/clubs"
              onClick={() => triggerHaptic()}
              data-accent={CLUB_COVER_FALLBACK.accent}
              className="home-slide relative grid aspect-[4/5] w-[84%] shrink-0 snap-center place-items-center overflow-hidden rounded-[30px] border border-white/70 bg-white/55 sm:w-[47%]"
            >
              <span className="px-4 text-center">
                <span className="block text-[15px] font-extrabold text-ink">
                  전체 {total}개 동아리
                </span>
                <span className="mt-1 block text-[12px] text-ink-soft">모두 둘러보기</span>
                <span className="mx-auto mt-3 grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-gold to-teal text-[#2B2103]">
                  →
                </span>
              </span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
