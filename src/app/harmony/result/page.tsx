"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CHILD_DIM_LABELS, type ChildDim } from "@/data/harmony/childSurvey";
import { getChildType, getCombo, getParentType } from "@/data/harmony/archetypes";
import {
  childTypeOf,
  levelLabel,
  parentTypeOf,
  type ChildScores,
  type ParentScores,
} from "@/lib/harmony/scoring";
import { clearHarmony, loadChildScores, loadParentScores } from "@/lib/harmony/storage";

export default function ResultPage() {
  const router = useRouter();
  const [parentScores, setParentScores] = useState<ParentScores | null>(null);
  const [childScores, setChildScores] = useState<ChildScores | null>(null);
  const [ready, setReady] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    const p = loadParentScores();
    const c = loadChildScores();
    if (!p || !c) {
      router.replace("/harmony");
      return;
    }
    setParentScores(p);
    setChildScores(c);
    setReady(true);
  }, [router]);

  if (!ready || !parentScores || !childScores) return null;

  const parent = getParentType(parentTypeOf(parentScores));
  const child = getChildType(childTypeOf(childScores));
  const combo = getCombo(parent.id, child.id);

  async function share() {
    const text = `우리 집 조합은 "${parent.name} 부모 × ${child.name} 아이" — ${combo.headline}\n블루하모니에서 우리 집 조합도 확인해 보세요.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "우리 집 기질 조합", text, url: location.origin + "/harmony" });
      } else {
        await navigator.clipboard.writeText(`${text}\n${location.origin}/harmony`);
      }
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      /* 사용자가 공유 시트를 닫은 경우 등 — 무시 */
    }
  }

  return (
    <main className="hy-wrap">
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
        <Link href="/harmony" className="hy-ghost" style={{ width: "auto", padding: "9px 14px", fontSize: 12.5, textDecoration: "none" }}>
          ← 처음으로
        </Link>
      </div>

      {/* ── 조합 카드 (공유의 단위) ── */}
      <section className="hy-card-navy hy-fade" aria-label="가족 조합 카드">
        <p className="hy-eyebrow" style={{ color: "#f2c77c" }}>OUR FAMILY COMBO</p>
        <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-.01em", margin: "8px 0 4px", wordBreak: "keep-all" }}>
          {parent.name} 부모 × {child.name} 아이
        </h1>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#cfe0ee", margin: "0 0 10px", wordBreak: "keep-all" }}>
          {combo.headline}
        </p>
        <p style={{ fontSize: 13, color: "#c4d5e4", lineHeight: 1.75, margin: "0 0 14px", wordBreak: "keep-all" }}>
          {combo.desc}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {combo.clashes.map((c, i) => (
            <span key={c} className="hy-chip" style={{ background: "rgba(255,255,255,.13)", color: "#e9f1f8" }}>
              충돌 {i + 1} · {c}
            </span>
          ))}
        </div>
        <p style={{ fontSize: 13, color: "#f2c77c", fontWeight: 600, margin: "0 0 16px", wordBreak: "keep-all" }}>
          강점 — {combo.strength}
        </p>
        <button onClick={share} className="hy-cta">
          {shared ? "복사·공유 완료!" : "조합 카드 공유하기"}
        </button>
      </section>

      {/* ── 첫수 팁 ── */}
      <section className="hy-card hy-fade" style={{ marginTop: 12, borderColor: "rgba(242,199,124,.4)" }}>
        <p className="hy-eyebrow" style={{ color: "#f2c77c" }}>오늘의 첫수</p>
        <p style={{ fontSize: 14, lineHeight: 1.75, margin: "6px 0 0", wordBreak: "keep-all" }}>{combo.firstMove}</p>
      </section>

      {/* ── 부모 프로필 ── */}
      <section className="hy-card hy-fade" style={{ marginTop: 12 }}>
        <p className="hy-eyebrow" style={{ color: "#6fb0de" }}>PARENT · {parent.name}</p>
        <p style={{ fontSize: 13.5, fontWeight: 700, margin: "6px 0 4px" }}>{parent.tagline}</p>
        <p style={{ fontSize: 12.5, color: "#aec3d4", lineHeight: 1.7, margin: "0 0 12px", wordBreak: "keep-all" }}>{parent.desc}</p>
        <ScoreBar label="감정 반응 속도" score={parentScores.speed} warm />
        <ScoreBar label="마음 읽기 지향" score={parentScores.style} warm />
        <p style={{ fontSize: 12, color: "#f2c77c", lineHeight: 1.65, margin: "12px 0 0", wordBreak: "keep-all" }}>
          {parent.watchout}
        </p>
      </section>

      {/* ── 아이 프로필 ── */}
      <section className="hy-card hy-fade" style={{ marginTop: 12 }}>
        <p className="hy-eyebrow" style={{ color: "#6fb0de" }}>CHILD · {child.name}</p>
        <p style={{ fontSize: 13.5, fontWeight: 700, margin: "6px 0 4px" }}>{child.tagline}</p>
        <p style={{ fontSize: 12.5, color: "#aec3d4", lineHeight: 1.7, margin: "0 0 12px", wordBreak: "keep-all" }}>{child.desc}</p>
        {(Object.keys(CHILD_DIM_LABELS) as ChildDim[]).map((dim) => (
          <ScoreBar key={dim} label={CHILD_DIM_LABELS[dim]} score={childScores[dim]} />
        ))}
        <p style={{ fontSize: 12, color: "#aec3d4", lineHeight: 1.65, margin: "12px 0 0", wordBreak: "keep-all" }}>
          이 기질이 바라는 것 — {child.needs}
        </p>
      </section>

      <a href="/harmony-play.html" className="hy-cta hy-fade" style={{ marginTop: 16, textDecoration: "none" }}>
        🎮 이 조합으로 미리 연습해보기
      </a>
      <button
        onClick={() => {
          clearHarmony();
          router.push("/harmony");
        }}
        className="hy-ghost"
        style={{ marginTop: 10 }}
      >
        검사 다시 하기
      </button>

      <p style={{ fontSize: 11, color: "#7e95a8", textAlign: "center", lineHeight: 1.8, marginTop: 24, wordBreak: "keep-all" }}>
        기질에는 좋고 나쁨이 없습니다. 이 결과는 참고용 프로파일이며 심리 검사·진단이 아닙니다.
      </p>
    </main>
  );
}

function ScoreBar({ label, score, warm }: { label: string; score: number; warm?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "96px 1fr 42px", gap: 10, alignItems: "center", marginTop: 8 }}>
      <span style={{ fontSize: 11.5, color: "#aec3d4" }}>{label}</span>
      <div className={warm ? "hy-bar warm" : "hy-bar"}>
        <i style={{ width: `${score}%` }} />
      </div>
      <span style={{ fontSize: 10.5, color: "#7e95a8", textAlign: "right", fontFamily: "ui-monospace, monospace" }}>
        {levelLabel(score)}
      </span>
    </div>
  );
}
