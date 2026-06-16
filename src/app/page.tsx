import { PromptSection } from "./components/PromptSection";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <main className="relative mx-auto max-w-2xl px-4 py-12">
        {/* 뱃지 */}
        <div className="mb-6 flex justify-center">
          <span className="glass-soft inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-skyx-ink shadow-[0_8px_24px_-8px_rgba(74,144,194,.22)]">
            <span
              className="h-[7px] w-[7px] rounded-full bg-teal"
              style={{ boxShadow: "0 0 0 4px rgba(53,195,180,.18), 0 0 10px rgba(53,195,180,.7)" }}
            />
            꿈꾸는교회 청년부 · 동아리 뭐 들지!?
          </span>
        </div>

        {/* Hero */}
        <div className="mb-10 text-center">
          <h1 className="mb-4 text-[34px] sm:text-[42px] font-extrabold tracking-tight leading-[1.28] text-ink">
            나에게 꼭 맞는{" "}
            <em className="not-italic gradient-text whitespace-nowrap">동아리</em>
            를
            <br />
            찾아보세요
          </h1>
          <p className="text-[15px] sm:text-base text-ink-soft font-medium leading-relaxed">
            내 성향에 꼭 맞는 동아리를 찾아드려요.
          </p>
        </div>

        {/* 4단계 슬라이드 카드 */}
        <PromptSection />

        {/* 하단 교회 라인아트 (로고 오마주) */}
        <div className="mt-16 flex justify-center sm:mt-20" aria-hidden>
          <svg viewBox="0 0 900 250" fill="none" xmlns="http://www.w3.org/2000/svg" className="block h-auto w-full max-w-[760px]">
            <defs>
              <linearGradient id="hillFill" x1="0" y1="190" x2="0" y2="250" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#FFFFFF" stopOpacity=".45" />
                <stop offset="1" stopColor="#FFFFFF" stopOpacity=".05" />
              </linearGradient>
            </defs>

            {/* 언덕 */}
            <path d="M0,214 C150,194 310,204 455,198 C610,192 770,202 900,208 L900,250 L0,250 Z" fill="url(#hillFill)" />
            <path d="M0,214 C150,194 310,204 455,198 C610,192 770,202 900,208" stroke="rgba(255,255,255,.9)" strokeWidth="2.5" strokeLinecap="round" />

            {/* 교회 라인아트 */}
            <g stroke="rgba(255,255,255,.95)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M450 28 V50 M441 37 H459" />
              <path d="M427 94 L450 56 L473 94 Z" />
              <path d="M431 94 V172 M469 94 V172" />
              <path d="M443 126 V114 A7 7 0 0 1 457 114 V126 Z" />
              <path d="M376 172 V136 L431 112" />
              <path d="M524 172 V136 L469 112" />
              <path d="M368 172 H532" />
              <path d="M394 168 V158 A6 6 0 0 1 406 158 V168 Z" />
              <path d="M494 168 V158 A6 6 0 0 1 506 158 V168 Z" />
              <path d="M440 172 V152 A10 10 0 0 1 460 152 V172" />
            </g>

            {/* 구름 라인아트 */}
            <g stroke="#9AA3AD" strokeOpacity=".55" strokeWidth="2.2" strokeLinecap="round">
              <path d="M118 92 a14 14 0 0 1 26 -7 a11 11 0 0 1 20 5 a9 9 0 0 1 6 16 H124 a10 10 0 0 1 -6 -14 Z" fill="rgba(255,255,255,.5)" />
              <path d="M742 128 a12 12 0 0 1 23 -6 a10 10 0 0 1 18 4 a8 8 0 0 1 5 14 H748 a9 9 0 0 1 -6 -12 Z" fill="rgba(255,255,255,.5)" />
            </g>

            {/* 골드 별 (첨탑 옆 — 로고의 ✶) */}
            <path d="M504,44 C505.6,53 508,55.4 517,57 C508,58.6 505.6,61 504,70 C502.4,61 500,58.6 491,57 C500,55.4 502.4,53 504,44 Z" fill="#F0B429" />
            <path d="M385,70 C386,75.4 387.6,77 393,78 C387.6,79 386,80.6 385,86 C384,80.6 382.4,79 377,78 C382.4,77 384,75.4 385,70 Z" fill="#D99B0B" />
            <path d="M560,100 C560.7,103.6 561.8,104.7 565.4,105.4 C561.8,106.1 560.7,107.2 560,110.8 C559.3,107.2 558.2,106.1 554.6,105.4 C558.2,104.7 559.3,103.6 560,100 Z" fill="#F0B429" opacity=".85" />
            <path d="M212 150 C212.8,154 214,155.2 218,156 C214,156.8 212.8,158 212,162 C211.2,158 210,156.8 206,156 C210,155.2 211.2,154 212,150 Z" fill="rgba(255,255,255,.9)" />
            <path d="M688 76 C688.8,80 690,81.2 694,82 C690,82.8 688.8,84 688,88 C687.2,84 686,82.8 682,82 C686,81.2 687.2,80 688,76 Z" fill="rgba(255,255,255,.9)" />

            {/* 민트 사각 포인트 */}
            <rect x="540" y="78" width="9" height="9" rx="2" fill="#35C3B4" transform="rotate(14 544.5 82.5)" />
            <rect x="346" y="100" width="6.5" height="6.5" rx="1.6" fill="#35C3B4" opacity=".75" transform="rotate(-10 349 103)" />
          </svg>
        </div>

        <p className="pb-6 pt-7 text-center text-[12.5px] font-medium text-ink/55">
          Dreaming Church — 꿈꾸는 하늘 위 <span className="mx-1 text-ink/30">·</span> 꿈꾸는교회 청년부{" "}
          <span className="mx-1 text-ink/30">·</span> BlueHumanity
        </p>
      </main>
    </div>
  );
}
