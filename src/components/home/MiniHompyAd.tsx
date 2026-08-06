/**
 * 홈 광고 구좌 — '미니홈피' 부활 예고. 홈 '광장 소식' 섹션 바로 아래 고정 노출.
 *
 * 강조 문구 한 줄만 둔다. 앱 고유의 글래스 카드 + 골드→틸 리본을 그대로 써서
 * 피드 리듬을 깨지 않으면서 '이 카드는 특별하다'만 표시한다(홈 브리핑 카드와 동일한 어법).
 */
export function MiniHompyAd() {
  return (
    <section aria-label="미니홈피 출시 예고">
      <div className="glass-card glass-ribbon relative overflow-hidden px-5 py-7 text-center">
        <p className="text-[22px] font-extrabold leading-tight tracking-tight text-ink">
          {/* 골드 단색 — 앱에서 골드는 '특별한 순간'을 뜻한다(btn-gold·킥커와 동일 어법).
              gradient-text는 4글자 폭에선 노랑 구간 대비가 떨어져 흐려 보여 쓰지 않는다. */}
          컴백, <span className="text-gold-ink">미니홈피</span>
          <span className="ml-1.5 align-baseline text-[14px] font-bold text-ink-faint">
            (2026.10)
          </span>
        </p>
      </div>
    </section>
  );
}
