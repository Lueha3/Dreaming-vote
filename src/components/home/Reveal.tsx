"use client";

import { useEffect, useRef } from "react";

/**
 * 스크롤 리빌 래퍼 — 뷰포트 진입 시 한 번 페이드업.
 * 스타일은 globals.css의 .reveal / .reveal-in이 담당하고, 여기선 클래스 토글만 한다.
 * prefers-reduced-motion은 CSS 쪽에서 처리(항상 보임)라 JS 분기가 필요 없다.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number; // 초 단위 시차 (칩 3개가 순서대로 떠오르는 연출용)
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.classList.add("reveal-in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("reveal-in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={delay ? ({ "--reveal-delay": `${delay}s` } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}
