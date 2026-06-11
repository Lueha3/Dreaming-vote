/* 전역 배경 아트 — 하늘 글로우 + 떠다니는 구름 + 트윙클 골드 별 (꿈꾸는 하늘) */

function Sparkle({ size, fill, opacity }: { size: number; fill: string; opacity?: number }) {
  return (
    <svg width={size} height={size} viewBox="-12 -12 24 24">
      <path
        d="M0,-11 C1.4,-3.2 3.2,-1.4 11,0 C3.2,1.4 1.4,3.2 0,11 C-1.4,3.2 -3.2,1.4 -11,0 C-3.2,-1.4 -1.4,-3.2 0,-11 Z"
        fill={fill}
        opacity={opacity ?? 1}
      />
    </svg>
  );
}

export function SkyBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {/* 라디얼 글로우 */}
      <div
        className="sky-glow"
        style={{
          width: 880, height: 560, left: "50%", top: -220, transform: "translateX(-50%)",
          background: "radial-gradient(closest-side, rgba(127,189,228,.55), transparent 70%)",
        }}
      />
      <div
        className="sky-glow"
        style={{
          width: 560, height: 460, right: -160, top: 60,
          background: "radial-gradient(closest-side, rgba(240,180,41,.30), transparent 70%)",
        }}
      />
      <div
        className="sky-glow"
        style={{
          width: 620, height: 520, left: -200, bottom: -140,
          background: "radial-gradient(closest-side, rgba(53,195,180,.26), transparent 70%)",
        }}
      />

      {/* 구름 */}
      <div className="sky-cloud" style={{ width: 340, height: 96, left: "6%", top: "16%" }} />
      <div className="sky-cloud" style={{ width: 260, height: 78, right: "8%", top: "30%", opacity: 0.85, animationDelay: "-4s" }} />
      <div className="sky-cloud" style={{ width: 420, height: 110, left: "14%", top: "62%", opacity: 0.6, animationDelay: "-8s" }} />
      <div className="sky-cloud" style={{ width: 300, height: 84, right: "4%", top: "74%", opacity: 0.7, animationDelay: "-12s" }} />

      {/* 골드/민트 스파클 별 (로고의 ✶) */}
      <span className="sky-star" style={{ left: "9%", top: "20%" }}><Sparkle size={22} fill="#F0B429" /></span>
      <span className="sky-star" style={{ right: "14%", top: "13%", animationDelay: "-1.2s" }}><Sparkle size={16} fill="#D99B0B" /></span>
      <span className="sky-star" style={{ right: "7%", top: "46%", animationDelay: "-2.4s" }}><Sparkle size={26} fill="#F0B429" opacity={0.85} /></span>
      <span className="sky-star" style={{ left: "5%", top: "58%", animationDelay: "-3.1s" }}><Sparkle size={14} fill="#F0B429" opacity={0.8} /></span>
      <span className="sky-star" style={{ left: "22%", top: "9%", animationDelay: "-4.2s" }}><Sparkle size={12} fill="#35C3B4" opacity={0.75} /></span>
      <span className="sky-star" style={{ right: "24%", top: "64%", animationDelay: "-1.8s" }}><Sparkle size={18} fill="#D99B0B" opacity={0.7} /></span>
    </div>
  );
}
