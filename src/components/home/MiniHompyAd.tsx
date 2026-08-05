/**
 * 홈 광고 구좌 — '미니홈피' 부활 티저 (2026.10 공개 예정).
 * 홈 '광장 소식' 섹션 바로 아래 고정 노출.
 *
 * 싸이월드 시절 미니홈피 창을 오마주한 레트로 카드 — 하늘색 타이틀바, TODAY/TOTAL 카운터,
 * 점선 다이어리 박스, 폴라로이드 사진, BGM 바까지. 앱의 글래스 톤과 '일부러' 다르게 생겨서
 * 광고가 눈에 들어오되, 우측 상단 AD 칩으로 광고임을 명시한다.
 *
 * 폴라로이드 2장은 실사진 대신 직접 그린 싸이월드 상징 일러스트(도토리/미니미) —
 * 실존 인물 사진을 쓰지 않기 위한 선택(초상권·저작권 회피). 인라인 SVG라 네트워크 요청도 없다.
 */

// 그 시절 국민 글꼴 — 돋움/굴림이 있는 기기에선 진짜 2000년대 질감이 난다.
const RETRO_FONT = `Dotum, "돋움", Gulim, "굴림", "Apple SD Gothic Neo", sans-serif`;

export function MiniHompyAd() {
  return (
    <section aria-label="광고 — 미니홈피 출시 예고">
      <div
        className="overflow-hidden rounded-[18px] border-2 border-[#C9B486] bg-[#FCF7E9] shadow-[0_16px_36px_-16px_rgba(120,95,40,0.45)]"
        style={{ fontFamily: RETRO_FONT }}
      >
        {/* 타이틀 바 — 하늘색 그라데이션, 미니홈피 창 이름 + AD 칩 */}
        <div className="flex items-center gap-2 border-b border-[#8FBBDD] bg-gradient-to-b from-[#C3E3F7] to-[#93C8EC] px-3.5 py-2">
          <span aria-hidden className="flex gap-1">
            <i className="h-2 w-2 rounded-full bg-white/80" />
            <i className="h-2 w-2 rounded-full bg-white/55" />
          </span>
          <span className="text-[11px] font-bold tracking-tight text-[#1E5E8E]">
            꿈꾸는동아리님의 미니홈피
          </span>
          <span className="ml-auto rounded-[4px] border border-[#1E5E8E]/40 bg-white/70 px-1.5 py-px text-[9px] font-bold text-[#1E5E8E]">
            AD
          </span>
        </div>

        {/* TODAY 카운터 줄 — 싸이월드 시그니처. TOTAL 2,026은 출시 연도 이스터에그 */}
        <div className="flex items-center justify-between border-b border-dashed border-[#D8C79C] bg-[#F6EED8] px-3.5 py-1.5 text-[10px] tracking-tight text-[#8A7549]">
          <span>
            TODAY <b className="text-[#F60]">1</b> | TOTAL <b>2,026</b>
          </span>
          <span>
            TODAY is... <b className="text-[#F60]">설렘</b> 💛
          </span>
        </div>

        <div className="px-4 pb-4 pt-3.5">
          {/* 헤드라인 */}
          <p className="text-[10px] font-bold tracking-[0.14em] text-[#F60]">
            COMING SOON · 2026.10
          </p>
          <h3 className="mt-1 text-[21px] font-extrabold leading-tight tracking-tight text-[#4A3B22]">
            &ldquo;컴백!! 미니홈피&rdquo;
          </h3>
          <p className="mt-1.5 text-[13px] font-bold text-[#6B5B3E]">다들 싸O월드 해보셨나요?</p>

          {/* 다이어리 점선 박스 — 그 시절 다이어리 글처럼 */}
          <div className="mt-2.5 rounded-[10px] border border-dashed border-[#C9B486] bg-white/60 px-3 py-2.5 text-[12px] leading-relaxed tracking-tight text-[#5E5138]">
            26년 10월, 과거에 많은 유저들의 사랑을 받았던 미니홈피 기능이 여기서 부활합니다.
            <br />
            미니미·방명록·일촌평·투데이까지, 그때 그 감성 그대로.
            <br />
            BGM 고르던 밤과 도토리 모으던 마음 — 이제 우리 청년부에서 다시 만나요.
          </div>

          {/* 그 시절 감성 폴라로이드 2장 — 도토리 / 미니미 일러스트 */}
          <div className="mt-4 grid grid-cols-2 gap-3 px-1">
            <figure className="-rotate-2 rounded-[6px] bg-white p-1.5 pb-2 shadow-[0_8px_18px_-8px_rgba(90,70,30,0.5)]">
              <span
                aria-hidden
                className="mx-auto -mt-3 mb-1 block h-3.5 w-12 rounded-[2px] bg-[#F3E6B8]/90 shadow-sm"
              />
              {/* 도토리 — 그 시절 화폐이자 마음 */}
              <svg
                viewBox="0 0 120 150"
                role="img"
                aria-label="도토리 일러스트"
                className="aspect-[4/5] w-full rounded-[3px]"
              >
                <rect width="120" height="150" fill="#FDF3D9" />
                <circle cx="22" cy="26" r="10" fill="#FFFFFF" opacity="0.8" />
                <circle cx="34" cy="30" r="13" fill="#FFFFFF" opacity="0.8" />
                <circle cx="98" cy="118" r="12" fill="#FFFFFF" opacity="0.6" />
                {/* 반짝이 */}
                <path d="M97 28 l2.6 7 7 2.6 -7 2.6 -2.6 7 -2.6 -7 -7 -2.6 7 -2.6 Z" fill="#F0B429" />
                <path d="M22 104 l1.8 4.8 4.8 1.8 -4.8 1.8 -1.8 4.8 -1.8 -4.8 -4.8 -1.8 4.8 -1.8 Z" fill="#35C3B4" opacity="0.85" />
                {/* 도토리 몸통 */}
                <path
                  d="M60 62 C78 62 88 76 88 92 C88 112 74 126 60 126 C46 126 32 112 32 92 C32 76 42 62 60 62 Z"
                  fill="#B5803C"
                />
                <ellipse cx="50" cy="90" rx="7" ry="12" fill="#FFFFFF" opacity="0.22" />
                {/* 모자 */}
                <path
                  d="M34 66 C38 50 50 42 60 42 C70 42 82 50 86 66 C78 72 68 74 60 74 C52 74 42 72 34 66 Z"
                  fill="#6B4A26"
                />
                <path d="M40 60 L46 68 M52 56 L56 70 M64 55 L64 71 M74 57 L70 69" stroke="#57391B" strokeWidth="2.4" strokeLinecap="round" />
                <rect x="56.5" y="30" width="7" height="14" rx="3.5" fill="#57391B" />
                {/* 얼굴 */}
                <circle cx="51" cy="96" r="2.6" fill="#3A2A12" />
                <circle cx="69" cy="96" r="2.6" fill="#3A2A12" />
                <path d="M55 104 Q60 108 65 104" stroke="#3A2A12" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                <circle cx="44" cy="102" r="3.5" fill="#E8927C" opacity="0.55" />
                <circle cx="76" cy="102" r="3.5" fill="#E8927C" opacity="0.55" />
              </svg>
              <figcaption className="mt-1.5 text-center text-[10px] tracking-tight text-[#8A7549]">
                도토리 5개의 감동.. 기억하시나요..
              </figcaption>
            </figure>
            <figure className="mt-2 rotate-[2.5deg] rounded-[6px] bg-white p-1.5 pb-2 shadow-[0_8px_18px_-8px_rgba(90,70,30,0.5)]">
              <span
                aria-hidden
                className="mx-auto -mt-3 mb-1 block h-3.5 w-12 rounded-[2px] bg-[#F3E6B8]/90 shadow-sm"
              />
              {/* 미니미 — 하늘색 옷을 입은 우리 청년부 미니미 */}
              <svg
                viewBox="0 0 120 150"
                role="img"
                aria-label="미니미 일러스트"
                className="aspect-[4/5] w-full rounded-[3px]"
              >
                <rect width="120" height="150" fill="#E3F2FC" />
                <circle cx="26" cy="24" r="11" fill="#FFFFFF" opacity="0.9" />
                <circle cx="40" cy="28" r="14" fill="#FFFFFF" opacity="0.9" />
                <circle cx="96" cy="40" r="12" fill="#FFFFFF" opacity="0.7" />
                {/* 잔디 */}
                <ellipse cx="60" cy="132" rx="34" ry="9" fill="#9CD08F" />
                {/* 팔 (몸 뒤) — 왼팔 인사 */}
                <path d="M40 92 Q28 84 30 72" stroke="#F5D5AE" strokeWidth="7" fill="none" strokeLinecap="round" />
                {/* 몸통 (하늘색 티셔츠) */}
                <path
                  d="M44 90 C44 84 51 80 60 80 C69 80 76 84 76 90 L76 112 C76 118 69 121 60 121 C51 121 44 118 44 112 Z"
                  fill="#7FBDE4"
                />
                <path d="M52 84 L52 118 M68 84 L68 118" stroke="#5FA5D3" strokeWidth="1.6" opacity="0.5" />
                {/* 오른팔 */}
                <path d="M76 94 Q84 100 82 110" stroke="#F5D5AE" strokeWidth="7" fill="none" strokeLinecap="round" />
                {/* 다리 */}
                <rect x="50" y="118" width="8" height="12" rx="4" fill="#F5D5AE" />
                <rect x="62" y="118" width="8" height="12" rx="4" fill="#F5D5AE" />
                {/* 머리 */}
                <circle cx="60" cy="56" r="24" fill="#F9E0BC" />
                {/* 앞머리 */}
                <path
                  d="M36 54 C36 40 46 32 60 32 C74 32 84 40 84 54 C78 48 72 46 66 47 C64 43 60 41 57 42 C50 42 40 46 36 54 Z"
                  fill="#4A3524"
                />
                {/* 눈·입·볼 */}
                <circle cx="51" cy="58" r="2.8" fill="#33261A" />
                <circle cx="69" cy="58" r="2.8" fill="#33261A" />
                <path d="M55 67 Q60 71 65 67" stroke="#33261A" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                <circle cx="44" cy="64" r="3.6" fill="#F3A08C" opacity="0.6" />
                <circle cx="76" cy="64" r="3.6" fill="#F3A08C" opacity="0.6" />
                {/* 머리 위 골드 별 */}
                <path d="M60 12 l2.4 6.4 6.4 2.4 -6.4 2.4 -2.4 6.4 -2.4 -6.4 -6.4 -2.4 6.4 -2.4 Z" fill="#F0B429" />
              </svg>
              <figcaption className="mt-1.5 text-center text-[10px] tracking-tight text-[#8A7549]">
                내 미니미.. 10월에 부활한ㄷㅏ..
              </figcaption>
            </figure>
          </div>
          <p className="mt-2 text-right text-[10px] tracking-tight text-[#B09A66]">
            from. 그 시절 감성 아카이브
          </p>

          {/* BGM 바 + 마무리 한 줄 */}
          <div className="mt-3 flex items-center gap-2 rounded-full border border-dashed border-[#C9B486] bg-white/70 px-3 py-1.5 text-[10.5px] tracking-tight text-[#8A7549]">
            <span aria-hidden className="text-[#F60]">
              ♪
            </span>
            <span className="font-bold">BGM</span>
            <span className="truncate">준비중… (10월에 공개돼요)</span>
            <span aria-hidden className="ml-auto text-[9px] text-[#C9B486]">
              ▶ ──────
            </span>
          </div>
          <p className="mt-2.5 text-center text-[11px] font-bold tracking-tight text-[#6B5B3E]">
            🤙 일촌 신청은 10월부터 · 도토리는 안 받아요
          </p>
        </div>
      </div>
    </section>
  );
}
