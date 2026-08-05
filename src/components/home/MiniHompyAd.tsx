/**
 * 홈 광고 구좌 — '미니홈피' 부활 티저 (2026.10 공개 예정).
 * 홈 '광장 소식' 섹션 바로 아래 고정 노출.
 *
 * 싸이월드 시절 미니홈피 창을 오마주한 레트로 카드 — 하늘색 타이틀바, TODAY/TOTAL 카운터,
 * 점선 다이어리 박스, 폴라로이드 사진, BGM 바까지. 앱의 글래스 톤과 '일부러' 다르게 생겨서
 * 광고가 눈에 들어오되, 우측 상단 AD 칩으로 광고임을 명시한다.
 *
 * 사진 2장은 운영자가 제공한 그 시절 감성 캡처: public/ad/minihompy-1.jpg, -2.jpg
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

          {/* 그 시절 감성 폴라로이드 2장 */}
          <div className="mt-4 grid grid-cols-2 gap-3 px-1">
            <figure className="-rotate-2 rounded-[6px] bg-white p-1.5 pb-2 shadow-[0_8px_18px_-8px_rgba(90,70,30,0.5)]">
              <span
                aria-hidden
                className="mx-auto -mt-3 mb-1 block h-3.5 w-12 rounded-[2px] bg-[#F3E6B8]/90 shadow-sm"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/ad/minihompy-1.jpg"
                alt="그 시절 미니홈피 감성 사진 1"
                loading="lazy"
                decoding="async"
                className="aspect-[4/5] w-full rounded-[3px] object-cover"
              />
              <figcaption className="mt-1.5 text-center text-[10px] tracking-tight text-[#8A7549]">
                난.. ㄱㅏ끔.. 눈물을 흘린ㄷㅏ..
              </figcaption>
            </figure>
            <figure className="mt-2 rotate-[2.5deg] rounded-[6px] bg-white p-1.5 pb-2 shadow-[0_8px_18px_-8px_rgba(90,70,30,0.5)]">
              <span
                aria-hidden
                className="mx-auto -mt-3 mb-1 block h-3.5 w-12 rounded-[2px] bg-[#F3E6B8]/90 shadow-sm"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/ad/minihompy-2.jpg"
                alt="그 시절 미니홈피 감성 사진 2"
                loading="lazy"
                decoding="async"
                className="aspect-[4/5] w-full rounded-[3px] object-cover"
              />
              <figcaption className="mt-1.5 text-center text-[10px] tracking-tight text-[#8A7549]">
                정말 너무 사랑한ㄷㅏ.. 죽을만큼..
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
