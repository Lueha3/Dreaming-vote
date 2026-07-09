"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * 홈 쇼케이스의 핵심 — 스크롤 반응형 기능 시연 슬라이드.
 * 섹션 높이를 (슬라이드 수 × 92vh + 100svh)로 잡고 내부를 sticky로 고정,
 * 스크롤 진행도로 활성 슬라이드를 계산한다(내리면 다음, 올리면 이전으로 되감김).
 * 네이티브 스크롤을 그대로 두는 방식이라 스크롤 하이재킹이 없다.
 * prefers-reduced-motion 사용자에겐 고정을 풀고 세로로 펼쳐 보여준다.
 */

type Slide = {
  emoji: string;
  label: string;
  title: [string, string];
  body: string;
};

const SLIDES: Slide[] = [
  {
    emoji: "🗣",
    label: "광장",
    title: ["오늘 있었던 일,", "그냥 편하게 올려요"],
    body: "인스타처럼 잘 꾸며야 할 것 같은 부담, 여기엔 없어요. 사진 없이 글만 올려도 되고, 말 못 할 기도제목은 익명으로 올릴 수 있어요.",
  },
  {
    emoji: "💬",
    label: "이번 주 질문",
    title: ["월요일마다", "새 질문이 하나 떠요"],
    body: "“요즘 나를 웃게 만든 순간은?” 같은 가벼운 질문이에요. 부담 없이 답하다 보면, 얘기 한 번 못 해본 사람의 취향도 알게 돼요.",
  },
  {
    emoji: "🎯",
    label: "동아리",
    title: ["취향 맞는 사람들이랑", "소모임 해요"],
    body: "성격유형 카드를 만들면 나랑 맞는 동아리를 추천해줘요. 운동, 스터디, 봉사, 뭐든 있어요. 모임 전날엔 알림도 와서 까먹을 일이 없어요.",
  },
  {
    emoji: "🌱",
    label: "새가족 환영",
    title: ["새로 온 사람은", "다 같이 환영해요"],
    body: "가입이 승인되면 환영 글이 자동으로 올라가고, 45일 동안 새싹 배지가 붙어요. 먼저 온 사람 중에 잘 맞을 것 같은 짝꿍도 이어줘요.",
  },
  {
    emoji: "🎂",
    label: "생일",
    title: ["생일엔 축하 글이", "알아서 올라와요"],
    body: "생일을 등록해두면 당일 아침에 축하 글이 자동으로 올라와요. 댓글로 축하가 쌓이는 거, 은근히 기분 좋아요.",
  },
  {
    emoji: "📅",
    label: "전체 행사",
    title: ["수련회, 청년의 날,", "이제 안 놓쳐요"],
    body: "청년부 전체 행사는 가입만 하면 자동으로 다 보여요. 누가 가는지도 보이고, 끝나면 사진이랑 후기도 한곳에 모여요.",
  },
];

const N = SLIDES.length;

/* ---------- 폰 화면 속 미니 UI 조각 ---------- */

function Ava({ tone, children }: { tone: "sky" | "gold" | "teal"; children: React.ReactNode }) {
  const bg =
    tone === "sky"
      ? "linear-gradient(135deg,#7FBDE4,#4A90C2)"
      : tone === "gold"
        ? "linear-gradient(135deg,#F0B429,#D99B0B)"
        : "linear-gradient(135deg,#35C3B4,#1A9D8F)";
  return (
    <span
      className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-extrabold text-white"
      style={{ background: bg }}
    >
      {children}
    </span>
  );
}

function Pill({ tone, children }: { tone: "sky" | "gold" | "teal"; children: React.ReactNode }) {
  const cls =
    tone === "sky"
      ? "border-skyx/45 bg-skyx/15 text-skyx-ink"
      : tone === "gold"
        ? "border-gold/40 bg-gold/10 text-gold-ink"
        : "border-teal/35 bg-teal/10 text-teal-ink";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${cls}`}>
      {children}
    </span>
  );
}

function TapBtn({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="tap-ring inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold text-[#3A2A02]"
      style={{ background: "linear-gradient(120deg,#F0B429,#35C3B4)" }}
    >
      {children}
    </span>
  );
}

function SCard({ gold = false, children }: { gold?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`rounded-2xl border p-2.5 text-[11px] shadow-[0_10px_24px_-14px_rgba(74,144,194,.35)] ${
        gold ? "border-gold/45 bg-[#FFFBF0]/90" : "border-white/95 bg-white/80"
      }`}
    >
      {children}
    </div>
  );
}

const Sub = ({ children }: { children: React.ReactNode }) => (
  <span className="block text-[10.5px] leading-relaxed text-ink-soft">{children}</span>
);
const SRow = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">{children}</div>
);
const STitle = ({ children }: { children: React.ReactNode }) => (
  <span className="pl-0.5 text-[13px] font-extrabold tracking-tight text-ink">{children}</span>
);

/* ---------- 슬라이드별 폰 화면 ---------- */

function ScreenContent({ index }: { index: number }) {
  switch (index) {
    case 0:
      return (
        <>
          <STitle>🗣 광장</STitle>
          <SCard>
            <div className="flex items-center gap-1.5">
              <Ava tone="sky">지</Ava>
              <b className="text-[11px]">러비아-23-지훈</b>
              <span className="text-[9.5px] text-ink-faint">10분 전</span>
            </div>
            <div className="mt-1.5">
              <Sub>오늘 첫 출근했어요!! 기도해주신 분들 감사합니다 🙇</Sub>
            </div>
            <SRow>
              <Pill tone="sky">💙 12</Pill>
              <Pill tone="sky">💬 5</Pill>
            </SRow>
          </SCard>
          <SCard>
            <div className="flex items-center gap-1.5">
              <Ava tone="teal">익</Ava>
              <b className="text-[11px]">익명</b>
              <Pill tone="gold">🙏 기도해주세요</Pill>
            </div>
            <div className="mt-1.5">
              <Sub>가족 일로 마음이 무거워요. 함께 기도해주세요.</Sub>
            </div>
            <SRow>
              <TapBtn>🙏 함께 기도해요</TapBtn>
            </SRow>
          </SCard>
        </>
      );
    case 1:
      return (
        <>
          <STitle>💬 이번 주 질문</STitle>
          <div className="rounded-xl border border-gold/30 bg-gold/10 px-3 py-2.5">
            <b className="block text-[11.5px] text-ink">요즘 나를 웃게 만든 순간은?</b>
            <span className="text-[10px] text-gold-ink">답변 23개 · 월요일에 올라온 질문</span>
          </div>
          <SCard>
            <div className="flex items-center gap-1.5">
              <Ava tone="teal">소</Ava>
              <b className="text-[11px]">유디코-24-소윤</b>
            </div>
            <div className="mt-1.5">
              <Sub>퇴근길에 본 노을이요. 사진 찍어서 광장에 올렸어요 ㅎㅎ</Sub>
            </div>
          </SCard>
          <SCard>
            <SRow>
              <TapBtn>답변하기</TapBtn>
              <Sub>나도 답해볼까?</Sub>
            </SRow>
          </SCard>
        </>
      );
    case 2:
      return (
        <>
          <STitle>🎯 동아리</STitle>
          <SCard>
            <b className="block text-[11.5px]">📚 수요 성경 스터디</b>
            <Sub>멤버 14명 · 나와 성향 일치 70%</Sub>
            <SRow>
              <TapBtn>가입 신청</TapBtn>
            </SRow>
          </SCard>
          <SCard>
            <b className="block text-[11.5px]">⏰ 내일 모임이 있어요</b>
            <Sub>&lsquo;러닝크루&rsquo; 모임이 24시간 안에 있어요. 잊지 마세요!</Sub>
          </SCard>
        </>
      );
    case 3:
      return (
        <>
          <STitle>🌱 새가족</STitle>
          <SCard gold>
            <b className="block text-[11.5px]">🎉 새가족이 왔어요</b>
            <Sub>엘리온-27-예은 님이 오셨어요. 함께 환영해주세요!</Sub>
            <SRow>
              <TapBtn>👋 환영해요</TapBtn>
              <Sub>31명이 환영했어요</Sub>
            </SRow>
          </SCard>
          <SCard>
            <b className="block text-[11.5px]">🤝 나의 환영 짝꿍</b>
            <Sub>유디코-24-소윤 님이 예은 님의 정착을 도와줘요</Sub>
            <SRow>
              <span className="flex">
                <Ava tone="teal">소</Ava>
                <span className="-ml-1.5">
                  <Ava tone="gold">예</Ava>
                </span>
              </span>
              <Sub>같은 또래 · 성향 비슷</Sub>
            </SRow>
          </SCard>
        </>
      );
    case 4:
      return (
        <>
          <STitle>🎂 생일</STitle>
          <SCard gold>
            <b className="block text-[11.5px]">🎂 오늘은 소윤님의 생일이에요!</b>
            <Sub>축하해주세요 🎉</Sub>
            <SRow>
              <Pill tone="gold">💙 27</Pill>
              <Pill tone="gold">💬 14</Pill>
            </SRow>
          </SCard>
          <SCard>
            <div className="flex items-center gap-1.5">
              <Ava tone="sky">지</Ava>
              <Sub>생일 축하해요!! 다음 주에 커피 사줄게요 ☕</Sub>
            </div>
          </SCard>
        </>
      );
    default:
      return (
        <>
          <STitle>📅 전체 행사</STitle>
          <SCard>
            <b className="block text-[11.5px]">⛰️ 여름 연합 수련회</b>
            <Sub>8월 14일 (금) · 러비아·유디코·엘리온 연합</Sub>
            <SRow>
              <span className="flex">
                <Ava tone="sky">지</Ava>
                <span className="-ml-1.5">
                  <Ava tone="gold">소</Ava>
                </span>
                <span className="-ml-1.5">
                  <Ava tone="teal">예</Ava>
                </span>
              </span>
              <Sub>86명이 가요</Sub>
            </SRow>
            <SRow>
              <TapBtn>나도 가요</TapBtn>
            </SRow>
          </SCard>
          <SCard>
            <b className="block text-[11.5px]">📸 지난 청년의 날</b>
            <Sub>사진 48장 · 후기 12개가 모였어요</Sub>
          </SCard>
        </>
      );
  }
}

/* ---------- 폰 프레임 ---------- */

function Phone({ active, staticMode = false }: { active: number; staticMode?: boolean }) {
  return (
    <div
      className="relative w-[min(210px,41svh)] shrink-0 rounded-[38px] border border-white/95 bg-white/85 p-2.5 shadow-[0_40px_90px_-30px_rgba(74,144,194,.5)] md:w-[min(290px,41svh)] md:rounded-[42px]"
      style={{ aspectRatio: "9 / 18.6" }}
    >
      {/* 노치 */}
      <div className="absolute left-1/2 top-4 z-10 h-4 w-16 -translate-x-1/2 rounded-lg bg-ink/90 md:top-5 md:h-5 md:w-20" />
      <div className="relative h-full w-full overflow-hidden rounded-[28px] bg-gradient-to-b from-[#E9F5FC] to-[#CCE4F6] md:rounded-[32px]">
        {staticMode ? (
          <div className="screen-on flex h-full flex-col gap-2 p-2.5 pt-10 md:pt-12">
            <ScreenContent index={active} />
          </div>
        ) : (
          SLIDES.map((_, i) => (
            <div
              key={i}
              className={`absolute inset-0 flex flex-col gap-2 p-2.5 pt-10 transition-all duration-500 md:pt-12 ${
                i === active ? "screen-on scale-100 opacity-100" : "scale-[.97] opacity-0"
              }`}
            >
              <ScreenContent index={i} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ---------- 텍스트 슬라이드 ---------- */

function SlideText({ slide }: { slide: Slide }) {
  return (
    <>
      <p className="eyebrow-label">
        {slide.emoji} {slide.label}
      </p>
      <h3 className="mb-3 mt-3 text-[clamp(23px,6.4vw,30px)] font-extrabold leading-[1.28] tracking-tight text-ink md:text-[clamp(27px,4.2vw,42px)]">
        {slide.title[0]}
        <br />
        {slide.title[1]}
      </h3>
      <p className="max-w-[26em] text-[14.5px] leading-relaxed text-ink-soft md:text-[16.5px] md:leading-[1.85]">
        {slide.body}
      </p>
    </>
  );
}

/* ---------- 메인 ---------- */

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function ScrollDemo() {
  const [active, setActive] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const activeRef = useRef(0);

  // SSR에선 애니메이션 모드로 렌더하고, 클라에서 모션 최소화 설정이면 정적 모드로 전환.
  const staticMode = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );

  useEffect(() => {
    if (staticMode) return;

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const sec = sectionRef.current;
        if (!sec) return;
        const total = sec.offsetHeight - window.innerHeight;
        if (total <= 0) return;
        const p = Math.min(1, Math.max(0, -sec.getBoundingClientRect().top / total));
        if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
        const idx = Math.min(N - 1, Math.floor(p * N));
        if (idx !== activeRef.current) {
          activeRef.current = idx;
          setActive(idx);
        }
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [staticMode]);

  /* 모션 최소화: 고정 없이 세로로 펼침 */
  if (staticMode) {
    return (
      <section id="demo" className="mx-auto max-w-2xl px-6 py-16">
        <div className="space-y-16">
          {SLIDES.map((slide, i) => (
            <div key={i}>
              <SlideText slide={slide} />
              <div className="mt-6 flex justify-center">
                <Phone active={i} staticMode />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      id="demo"
      ref={sectionRef}
      className="relative"
      style={{ height: `calc(${N * 92}vh + 100svh)` }}
    >
      <div className="sticky top-0 mx-auto flex h-[100svh] max-w-5xl flex-col gap-3 overflow-hidden px-6 pb-4 pt-[76px] md:grid md:grid-cols-[6fr_5fr] md:items-center md:gap-16 md:pb-10">
        {/* 진행 바 */}
        <span
          className="absolute left-6 right-6 top-[64px] block h-[3px] overflow-hidden rounded-sm bg-skyx-deep/[.18] md:top-[68px]"
          aria-hidden
        >
          <span
            ref={barRef}
            className="block h-full w-full origin-left scale-x-0 bg-gradient-to-r from-gold to-teal"
          />
        </span>

        {/* 텍스트 슬라이드 스택 */}
        <div className="relative min-h-[218px] md:min-h-[360px]" aria-live="polite">
          {SLIDES.map((slide, i) => (
            <div
              key={i}
              className={`absolute inset-0 flex flex-col justify-start transition-all duration-500 ease-out md:justify-center ${
                i === active
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-6 opacity-0"
              }`}
            >
              <SlideText slide={slide} />
            </div>
          ))}

          {/* 도트 + 힌트 (텍스트 스택 아래 고정) */}
          <div className="absolute -bottom-1 left-0 md:bottom-6">
            <div className="flex gap-2" aria-hidden>
              {SLIDES.map((_, i) => (
                <span
                  key={i}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === active ? "w-6 bg-skyx-deep" : "w-2 bg-skyx-deep/25"
                  }`}
                />
              ))}
            </div>
            <p className="mt-3 hidden text-[12.5px] font-semibold text-ink-faint md:block">
              스크롤을 내리면 다음 기능, 올리면 이전 기능이 보여요
            </p>
          </div>
        </div>

        {/* 폰 (남는 세로 공간에 배치 — 짧은 화면에선 하단이 자연스럽게 잘림) */}
        <div className="flex min-h-0 flex-1 justify-center overflow-hidden md:block md:flex-none md:overflow-visible">
          <div className="md:flex md:justify-center" aria-hidden>
            <Phone active={active} />
          </div>
        </div>
      </div>
    </section>
  );
}
