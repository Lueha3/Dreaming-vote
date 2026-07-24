"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { PARENT_SCALE_LABELS, PARENT_SURVEY } from "@/data/harmony/parentSurvey";
import { CHILD_SURVEY } from "@/data/harmony/childSurvey";
import { scoreChild, scoreParent, type Answers } from "@/lib/harmony/scoring";
import {
  loadChildScores,
  loadParentScores,
  saveChildScores,
  saveParentScores,
} from "@/lib/harmony/storage";
import { triggerHaptic } from "@/lib/haptics";

const META = {
  parent: {
    title: "부모 양육 성향 검사",
    hint: "정답은 없어요. '이래야 하는 나'가 아니라 '평소의 나'로 답해주세요.",
    survey: PARENT_SURVEY,
  },
  child: {
    title: "아이 기질 검사",
    hint: "아이가 여럿이면 지금 가장 마음 쓰이는 아이 한 명을 떠올려 주세요.",
    survey: CHILD_SURVEY,
  },
} as const;

export function SurveyRunner({ subject }: { subject: "parent" | "child" }) {
  const router = useRouter();
  const { title, hint, survey } = META[subject];
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const item = survey[idx];
  const progress = useMemo(() => Math.round((idx / survey.length) * 100), [idx, survey.length]);

  function finish(finalAnswers: Answers) {
    if (subject === "parent") {
      saveParentScores(scoreParent(finalAnswers));
      router.push(loadChildScores() ? "/harmony/result" : "/harmony/test/child");
    } else {
      saveChildScores(scoreChild(finalAnswers));
      router.push(loadParentScores() ? "/harmony/result" : "/harmony/test/parent");
    }
  }

  function answer(value: number) {
    triggerHaptic();
    const next = { ...answers, [item.id]: value };
    setAnswers(next);
    // 선택 표시가 잠깐 보인 뒤 다음 문항으로 — 오답 불안 없이 리듬감 있게.
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => {
      if (idx + 1 >= survey.length) finish(next);
      else setIdx(idx + 1);
    }, 180);
  }

  return (
    <main className="hy-wrap">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        {idx > 0 ? (
          <button
            onClick={() => setIdx(idx - 1)}
            className="hy-ghost"
            style={{ width: "auto", padding: "9px 14px", fontSize: 12.5 }}
          >
            ← 이전
          </button>
        ) : (
          <Link href="/harmony" className="hy-ghost" style={{ width: "auto", padding: "9px 14px", fontSize: 12.5, textDecoration: "none" }}>
            ← 나가기
          </Link>
        )}
        <span className="hy-eyebrow" style={{ marginLeft: "auto" }}>
          {idx + 1} / {survey.length}
        </span>
      </div>

      <div className="hy-bar warm" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
        <i style={{ width: `${Math.max(progress, 3)}%` }} />
      </div>

      <header style={{ margin: "22px 0 6px" }}>
        <p className="hy-eyebrow" style={{ color: "#6fb0de" }}>{title}</p>
      </header>

      {/* key로 문항 전환마다 페이드 재생 */}
      <div key={item.id} className="hy-fade">
        <h1
          style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.5, letterSpacing: "-.01em", margin: "6px 0 20px", wordBreak: "keep-all", minHeight: 96 }}
        >
          {item.text}
        </h1>

        <div style={{ display: "grid", gap: 9 }}>
          {PARENT_SCALE_LABELS.map((label, value) => (
            <button
              key={label}
              className="hy-answer"
              aria-pressed={answers[item.id] === value}
              onClick={() => answer(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p style={{ fontSize: 12, color: "#7e95a8", lineHeight: 1.7, marginTop: 22, textAlign: "center", wordBreak: "keep-all" }}>
        {hint}
      </p>
    </main>
  );
}
