"use client";

import { useEffect, useRef, useState } from "react";
import { fetchJson } from "@/lib/http";

type Recap = {
  monthOf: string;
  postCount: number;
  reactionCount: number;
  commentCount: number;
  newcomerCount: number;
  birthdayCount: number;
  answeredPrayerCount: number;
  topPostSnippet: string | null;
  topPostAuthorName: string | null;
  topPostReactionCount: number | null;
};

function monthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", { month: "long", timeZone: "Asia/Seoul" });
}

function dismissKey(monthOf: string) {
  return `recap-dismissed-${monthOf}`;
}

/** 슬라이드 1장 — 전체 화면 스냅 뷰의 한 페이지. */
function Slide({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex h-full w-full shrink-0 flex-col items-center justify-center px-8 text-center"
      style={{ scrollSnapAlign: "start" }}
    >
      <div className="glass-card w-full max-w-sm px-7 py-10">{children}</div>
    </div>
  );
}

function Big({ children }: { children: React.ReactNode }) {
  return (
    <p className="gradient-text mt-1 text-5xl font-black tracking-tight" style={{ fontVariantNumeric: "tabular-nums" }}>
      {children}
    </p>
  );
}

/** 스크롤로 넘기는 리캡 뷰어 — 홈 쇼케이스의 ScrollDemo와 같은 세계관(스와이프X, 자연 스크롤). */
function RecapViewer({ recap, month, onClose }: { recap: Recap; month: string; onClose: () => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const N = 5;

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    function onScroll() {
      if (!el) return;
      const idx = Math.round(el.scrollTop / el.clientHeight);
      setActive(Math.max(0, Math.min(N - 1, idx)));
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const hasTopPost = !!recap.topPostSnippet && !!recap.topPostReactionCount;

  return (
    <div className="fixed inset-0 z-[75] bg-[rgba(46,110,158,.35)] backdrop-blur-sm">
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="glass-soft absolute right-4 top-[calc(env(safe-area-inset-top)+12px)] z-10 flex h-9 w-9 items-center justify-center rounded-full text-ink-soft"
      >
        ✕
      </button>

      <div className="absolute left-1/2 top-[calc(env(safe-area-inset-top)+16px)] z-10 flex -translate-x-1/2 gap-1.5" aria-hidden>
        {Array.from({ length: N }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${i === active ? "w-6 bg-white" : "w-1.5 bg-white/45"}`}
          />
        ))}
      </div>

      <div
        ref={trackRef}
        className="h-full overflow-y-auto"
        style={{ scrollSnapType: "y mandatory" }}
      >
        <Slide>
          <span className="text-4xl" aria-hidden>🌤️</span>
          <h3 className="mt-3 text-2xl font-extrabold leading-snug text-ink">
            {month},<br />
            우리 청년부는
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            한 달 동안 광장에서 일어난 일들을 모아봤어요
          </p>
        </Slide>

        <Slide>
          <span className="text-3xl" aria-hidden>🗣</span>
          <p className="mt-2 text-sm font-semibold text-ink-soft">광장에 올라온 이야기</p>
          <Big>{recap.postCount}개</Big>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            공감 {recap.reactionCount}번, 댓글 {recap.commentCount}개가 오갔어요.
          </p>
          {hasTopPost && (
            <p className="mt-3 rounded-xl border border-gold/30 bg-gold/5 px-3 py-2.5 text-xs leading-relaxed text-ink-soft">
              가장 많은 공감을 받은 글은 <b className="text-ink">{recap.topPostAuthorName}</b>님의
              &ldquo;{recap.topPostSnippet}&rdquo; 💙 {recap.topPostReactionCount}
            </p>
          )}
        </Slide>

        <Slide>
          <span className="text-3xl" aria-hidden>🌱</span>
          <p className="mt-2 text-sm font-semibold text-ink-soft">새로 온 얼굴</p>
          <Big>{recap.newcomerCount}명</Big>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            {recap.newcomerCount > 0
              ? "새가족을 환영하는 인사가 계속 이어졌어요 🤝"
              : "이번 달엔 새로 온 얼굴이 없었어요"}
          </p>
        </Slide>

        <Slide>
          <span className="text-3xl" aria-hidden>🎂</span>
          <p className="mt-2 text-sm font-semibold text-ink-soft">함께 축하한 날들</p>
          <Big>{recap.birthdayCount}번</Big>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            생일 축하 {recap.birthdayCount}번
            {recap.answeredPrayerCount > 0 && <>, 응답된 기도 {recap.answeredPrayerCount}개 🌿</>}
          </p>
        </Slide>

        <Slide>
          <span className="text-3xl" aria-hidden>💙</span>
          <h3 className="mt-3 text-xl font-extrabold leading-snug text-ink">
            이번 달 우리는
            <br />
            조금 더 가까워졌어요
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">다음 달에도 광장에서 만나요!</p>
          <button type="button" onClick={onClose} className="btn-gold mt-6 rounded-full px-6 py-2.5 text-sm font-semibold">
            확인했어요
          </button>
        </Slide>
      </div>
    </div>
  );
}

/** 광장 상단 배너 — 새 리캡이 나오면 노출, 탭하면 전체화면 뷰어로. 닫으면 그 달치는 다시 안 뜬다. */
export function MonthlyRecapBanner() {
  const [recap, setRecap] = useState<Recap | null>(null);
  const [dismissed, setDismissed] = useState(true); // localStorage 확인 전 깜빡임 방지
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    fetchJson<{ ok: true; recap: Recap | null }>("/api/recap/latest")
      .then((data) => {
        if (!data.recap) return;
        setRecap(data.recap);
        setDismissed(localStorage.getItem(dismissKey(data.recap.monthOf)) === "1");
      })
      .catch(() => {});
  }, []);

  if (!recap || dismissed) return null;

  const month = monthLabel(recap.monthOf);

  function dismiss() {
    if (recap) localStorage.setItem(dismissKey(recap.monthOf), "1");
    setDismissed(true);
  }

  return (
    <>
      <div className="glass-card glass-ribbon relative mb-4 overflow-hidden p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>📸</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink">{month} 리캡이 도착했어요</p>
            <p className="mt-0.5 text-xs text-ink-soft">
              글 {recap.postCount}개 · 공감 {recap.reactionCount}번 · 새가족 {recap.newcomerCount}명
            </p>
          </div>
          <button
            type="button"
            onClick={() => setViewerOpen(true)}
            className="btn-gold shrink-0 rounded-full px-4 py-2 text-xs font-semibold"
          >
            보러가기
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="닫기"
            className="shrink-0 text-ink-faint transition-colors hover:text-ink"
          >
            ✕
          </button>
        </div>
      </div>

      {viewerOpen && <RecapViewer recap={recap} month={month} onClose={() => setViewerOpen(false)} />}
    </>
  );
}
