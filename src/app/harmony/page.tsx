"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadChildScores, loadParentScores } from "@/lib/harmony/storage";

export default function HarmonyIntroPage() {
  const [parentDone, setParentDone] = useState(false);
  const [childDone, setChildDone] = useState(false);

  useEffect(() => {
    setParentDone(!!loadParentScores());
    setChildDone(!!loadChildScores());
  }, []);

  const bothDone = parentDone && childDone;

  return (
    <main className="hy-wrap">
      <header className="hy-fade" style={{ textAlign: "center", margin: "18px 0 26px" }}>
        <p className="hy-eyebrow">BLUEHARMONY · COMPASS</p>
        <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-.02em", margin: "10px 0 8px", wordBreak: "keep-all" }}>
          우리 집 기질 나침반
        </h1>
        <p style={{ fontSize: 14, color: "#aec3d4", lineHeight: 1.75, wordBreak: "keep-all" }}>
          부모의 성향과 아이의 타고난 기질이 만나면
          <br />
          우리 집만의 조합이 생깁니다. 각 5분, 두 번의 검사면 충분해요.
        </p>
      </header>

      <div style={{ display: "grid", gap: 12 }}>
        <Link href="/harmony/test/parent" className="hy-card hy-fade" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
          <span className="hy-eyebrow" style={{ color: "#6fb0de" }}>STEP 1 · 약 5분</span>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: "6px 0 4px" }}>부모 양육 성향 검사</h2>
          <p style={{ fontSize: 13, color: "#aec3d4", lineHeight: 1.65, margin: 0, wordBreak: "keep-all" }}>
            갈등의 순간, 나는 어떤 부모인가 — 12문항
          </p>
          <span className={parentDone ? "hy-chip-warm hy-chip" : "hy-chip"} style={{ marginTop: 10 }}>
            {parentDone ? "완료 — 다시 하기 가능" : "시작하기"}
          </span>
        </Link>

        <Link href="/harmony/test/child" className="hy-card hy-fade" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
          <span className="hy-eyebrow" style={{ color: "#6fb0de" }}>STEP 2 · 약 5분</span>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: "6px 0 4px" }}>아이 기질 검사</h2>
          <p style={{ fontSize: 13, color: "#aec3d4", lineHeight: 1.65, margin: 0, wordBreak: "keep-all" }}>
            평소 관찰한 모습 그대로 답해주세요 — 18문항
          </p>
          <span className={childDone ? "hy-chip-warm hy-chip" : "hy-chip"} style={{ marginTop: 10 }}>
            {childDone ? "완료 — 다시 하기 가능" : "시작하기"}
          </span>
        </Link>
      </div>

      {bothDone && (
        <Link href="/harmony/result" className="hy-cta hy-fade" style={{ marginTop: 16, textDecoration: "none" }}>
          우리 집 조합 카드 보기
        </Link>
      )}

      <a href="/harmony-play.html" className="hy-ghost hy-fade" style={{ marginTop: bothDone ? 10 : 16, textDecoration: "none" }}>
        🎮 연습 모드 — 시뮬레이터 체험판 해보기
      </a>

      <p style={{ fontSize: 11, color: "#7e95a8", textAlign: "center", lineHeight: 1.8, marginTop: 26, wordBreak: "keep-all" }}>
        결과는 참고용 프로파일이며 심리 검사·진단이 아닙니다.
        <br />
        응답은 이 기기에만 저장됩니다.
      </p>
    </main>
  );
}
