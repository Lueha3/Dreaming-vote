"use client";

import { Fragment, useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * 홈 쇼케이스 S2 — '왜 만들었냐면요'를 스크롤에 맞춰 광고처럼 재생한다.
 * 고정 헤드라인 아래에서 문제 제기 → 체념 → 반전 → 해답 → 브랜드 선언 순으로
 * 카피 비트가 차례로 뜨고 사라지고, 해답 비트에 닿으면 헤드라인의 '없었어요'가
 * '있어요'로 뒤집힌다. ScrollDemo.tsx와 같은 sticky+scroll 패턴을 쓴다.
 */

type LineSpec = { text: string; size?: "xl" | "sub" | "imp" | "big" | "pre"; typed?: boolean };
type PillTone = "sky" | "gold" | "teal";
type Pills = { variant: "spread" | "tight"; items: { tone: PillTone; label: string }[] };
type Beat = {
  fx: "rise" | "focus" | "dim" | "type" | "finale" | "logo";
  lines?: LineSpec[];
  rule?: boolean; // line[0]과 line[1] 사이에 스스로 그어지는 경계선을 넣는다
  resolve?: boolean; // 이 비트부터 고정 헤드라인이 '없었어요' → '있어요'로 뒤집힌다
  pills?: Pills;
};

const communityPills = (variant: Pills["variant"]): Pills => ({
  variant,
  items: [
    { tone: "sky", label: "러비아" },
    { tone: "gold", label: "유디코" },
    { tone: "teal", label: "엘리온" },
  ],
});

const BEATS: Beat[] = [
  { fx: "rise", lines: [{ text: "친해지고 싶어도," }, { text: "「접점」이 없었어요." }] },
  { fx: "rise", lines: [{ text: "소식은 언제나," }, { text: "한 다리 「건너」 들었어요." }] },
  { fx: "rise", lines: [{ text: "교회에서 친해지고 싶은" }, { text: "그 「친구」," }] },
  { fx: "rise", lines: [{ text: "매주 만나는 사이," }, { text: "매주 「스쳐 가는」 사이지만" }] },
  { fx: "focus", rule: true, lines: [{ text: "나이대라는 「선」." }, { text: "꿈터라는 「벽」." }] },
  {
    fx: "rise",
    lines: [
      { text: "우리는 같은 교회 청년부인데도", size: "pre" },
      { text: "서로를 「알 길」이 없었어요.", size: "imp", typed: true },
    ],
  },
  { fx: "dim", lines: [{ text: "'300명이나 되는데, 어쩔 수 없지.'" }] },
  {
    fx: "rise",
    pills: communityPills("spread"),
    lines: [{ text: "가장 가까운 곳의," }, { text: "가장 「먼 이름들」." }],
  },
  { fx: "type", lines: [{ text: "그래서, 만들었어요." }] },
  {
    fx: "rise",
    resolve: true,
    lines: [
      { text: "이제, 「있어요」.", size: "xl" },
      { text: "청년부 전체가 함께 만들어가는 첫 번째 소통의 장 — 우리가 만드는 청년부 이야기", size: "sub" },
    ],
  },
  {
    fx: "finale",
    pills: communityPills("tight"),
    lines: [{ text: "우리는," }, { text: "“「꿈꾸는교회 청년부」”", size: "big" }, { text: "입니다." }],
  },
  { fx: "logo" },
];

const N = BEATS.length;
const RESOLVE_IDX = Math.max(0, BEATS.findIndex((b) => b.resolve));

/* ---------- 「강조」 마커 파싱 ---------- */

type Run = { text: string; hl: boolean };

// 「」로 감싼 구간을 강조(hl)로 표시하며 줄 전체를 (글자, 강조여부) 런 시퀀스로 푼다.
function parseRuns(raw: string): Run[] {
  const runs: Run[] = [];
  let hl = false;
  let buf = "";
  for (const ch of raw) {
    if (ch === "「") {
      if (buf) runs.push({ text: buf, hl });
      buf = "";
      hl = true;
      continue;
    }
    if (ch === "」") {
      if (buf) runs.push({ text: buf, hl });
      buf = "";
      hl = false;
      continue;
    }
    buf += ch;
  }
  if (buf) runs.push({ text: buf, hl });
  return runs;
}

// 공백 기준으로 단어를 재조립한다 — 강조 상태가 단어 중간에 바뀌어도(따옴표 등) 같은 단어로 묶인다.
function splitWords(raw: string): Run[][] {
  const words: Run[][] = [[]];
  parseRuns(raw).forEach((run) => {
    run.text.split(" ").forEach((part, i) => {
      if (i > 0) words.push([]);
      if (part.length) words[words.length - 1].push({ text: part, hl: run.hl });
    });
  });
  return words.filter((w) => w.length > 0);
}

type CharSeg = { hl: boolean; chars: { ch: string; delay: number }[] };

// 타자기용 — 「」 상태가 바뀔 때만 새 세그먼트를 만들어, 강조 구간은 하나의 그라데이션 span으로 묶는다.
function buildTypedSegments(raw: string, startDelay: number, step = 0.07) {
  const segments: CharSeg[] = [];
  let hl = false;
  let delay = startDelay;
  let current: CharSeg | null = null;
  for (const ch of raw) {
    if (ch === "「") {
      hl = true;
      current = null;
      continue;
    }
    if (ch === "」") {
      hl = false;
      current = null;
      continue;
    }
    if (!current || current.hl !== hl) {
      current = { hl, chars: [] };
      segments.push(current);
    }
    current.chars.push({ ch, delay });
    delay += step;
  }
  return { segments, endDelay: delay };
}

/* ---------- 비트 안 줄 렌더링 — 단어 상승/타자기 딜레이는 비트 하나당 이어서 누적한다 ----------
   소문자로 시작하는 평범한 헬퍼 함수로 둔다(컴포넌트가 아님) — PascalCase 컴포넌트로 만들면
   렌더 중 delay 지역변수 재할당을 리액트 컴파일러 lint가 "렌더 이후 재할당"으로 오탐한다. */
function renderBeatLines({
  lines,
  wholeTyped,
  ruleAfter,
}: {
  lines: LineSpec[];
  wholeTyped: boolean;
  ruleAfter?: number;
}) {
  let delay = 0;
  return (
    <>
      {lines.map((line, li) => {
        const typed = wholeTyped || line.typed;
        const cls = `why-line${line.size ? ` why-line-${line.size}` : ""}`;
        let node: React.ReactNode;
        if (typed) {
          if (li > 0) delay += 0.35;
          const caretDelay = delay;
          const { segments, endDelay } = buildTypedSegments(line.text, delay);
          delay = endDelay;
          node = (
            <p className={cls}>
              {segments.map((seg, si) => {
                const chars = seg.chars.map((c, ci) => (
                  <span className="why-char" style={{ "--d": `${c.delay.toFixed(2)}s` } as React.CSSProperties} key={ci}>
                    {c.ch}
                  </span>
                ));
                return seg.hl ? (
                  <span className="gradient-text" key={si}>
                    {chars}
                  </span>
                ) : (
                  <span key={si}>{chars}</span>
                );
              })}
              <span className="why-caret" style={{ "--caret-d": `${caretDelay.toFixed(2)}s` } as React.CSSProperties} />
            </p>
          );
        } else {
          const words = splitWords(line.text);
          node = (
            <p className={cls}>
              {words.map((word, wi) => {
                const d = delay;
                delay += 0.07;
                return (
                  // 단어 사이 공백은 .why-word(overflow:clip) 밖의 형제 텍스트 노드여야 한다 —
                  // 안에 넣으면 인라인블록 자체 흐름의 '줄 시작' 공백으로 취급돼 접혀 사라진다.
                  <Fragment key={wi}>
                    {wi > 0 ? " " : ""}
                    <span className="why-word">
                      <span className="why-word-inner" style={{ "--d": `${d.toFixed(2)}s` } as React.CSSProperties}>
                        {word.map((run, ri) =>
                          run.hl ? (
                            <span className="gradient-text" key={ri}>
                              {run.text}
                            </span>
                          ) : (
                            run.text
                          ),
                        )}
                      </span>
                    </span>
                  </Fragment>
                );
              })}
            </p>
          );
        }
        return (
          <Fragment key={li}>
            {node}
            {ruleAfter === li && <span className="why-rule" />}
          </Fragment>
        );
      })}
    </>
  );
}

function PillsRow({ pills }: { pills: Pills }) {
  const delays = pills.variant === "spread" ? [0.05, 0.16, 0.27] : [0.05, 0.13, 0.21];
  return (
    <div className={`why-pills why-pills-${pills.variant}`}>
      {pills.items.map((p, i) => (
        <span
          key={p.label}
          className={`why-pill why-pill-${p.tone}`}
          style={{ "--d": `${delays[i]}s` } as React.CSSProperties}
        >
          {p.label}
        </span>
      ))}
    </div>
  );
}

function BeatView({ beat, state }: { beat: Beat; state: "" | "on" | "past" }) {
  return (
    <div className={`why-beat ${state}`.trim()} data-fx={beat.fx}>
      {beat.pills && <PillsRow pills={beat.pills} />}
      {beat.fx === "logo" ? (
        <>
          <span className="why-halo" aria-hidden />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="why-logo" alt="꿈꾸는교회" src="/dreaming-church.png" />
        </>
      ) : (
        beat.lines &&
        renderBeatLines({ lines: beat.lines, wholeTyped: beat.fx === "type", ruleAfter: beat.rule ? 0 : undefined })
      )}
    </div>
  );
}

function Star({ size, fill }: { size: number; fill: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none" aria-hidden>
      <path
        d="M13 1c1.4 7.4 3.4 9.4 11 11-7.6 1.6-9.6 3.6-11 11-1.4-7.4-3.4-9.4-11-11 7.6-1.6 9.6-3.6 11-11Z"
        fill={fill}
      />
    </svg>
  );
}

/* ---------- 정적(모션 최소화) 대체 — 전부 펼쳐서 그대로 보여준다 ---------- */

function flattenPlain(text: string) {
  return text.replace(/[「」]/g, "");
}

function StaticStory() {
  return (
    <section className="px-6 py-[clamp(64px,10vh,110px)] text-center">
      <p className="eyebrow-label justify-center">왜 만들었냐면요</p>
      <h2 className="why-headline mx-auto mt-4 max-w-[18em] text-ink">
        300명이 같은 교회 다니는데,
        <br />
        다 같이 모일 곳은 <span className="gradient-text">있어요</span>
      </h2>
      <div className="mx-auto mt-10 max-w-[26em] space-y-7">
        {BEATS.map((beat, i) =>
          beat.fx === "logo" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src="/dreaming-church.png" alt="꿈꾸는교회" className="mx-auto w-[180px]" />
          ) : (
            <div key={i}>
              {beat.pills && (
                <div className="mb-2 flex justify-center gap-2">
                  {beat.pills.items.map((p) => (
                    <span key={p.label} className={`why-pill why-pill-${p.tone}`} style={{ opacity: 1, transform: "none" }}>
                      {p.label}
                    </span>
                  ))}
                </div>
              )}
              {beat.lines?.map((line, li) => (
                <p key={li} className={`why-line${line.size ? ` why-line-${line.size}` : ""}`}>
                  {flattenPlain(line.text)}
                </p>
              ))}
            </div>
          ),
        )}
      </div>
    </section>
  );
}

/* ---------- 스크롤 드라이버 ---------- */

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function WhyWeBuilt() {
  const [active, setActive] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
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

  if (staticMode) return <StaticStory />;

  const resolved = active >= RESOLVE_IDX;

  return (
    <section id="why" ref={sectionRef} className="why-story" style={{ height: `calc(${N} * 66vh + 100svh)` }}>
      <div className={`why-stage ${resolved ? "why-resolved" : ""}`.trim()}>
        <span
          className="sky-glow"
          style={{ width: 340, height: 340, left: -110, top: -70, background: "rgba(127,189,228,.45)" }}
          aria-hidden
        />
        <span
          className="sky-glow why-glow-b"
          style={{ width: 300, height: 300, right: -90, bottom: "8%", background: "rgba(240,180,41,.18)" }}
          aria-hidden
        />
        <span className="sky-star" style={{ left: "12%", top: "22%" }} aria-hidden>
          <Star size={20} fill="#F0B429" />
        </span>
        <span className="sky-star" style={{ right: "5%", top: "6%", animationDelay: "-1.6s" }} aria-hidden>
          <Star size={13} fill="#D99B0B" />
        </span>
        <span className="sky-star" style={{ right: "24%", bottom: "20%", animationDelay: "-2.5s" }} aria-hidden>
          <Star size={11} fill="#FFFFFF" />
        </span>

        <p className="eyebrow-label">왜 만들었냐면요</p>
        <h2 className="why-headline">
          300명이 같은 교회 다니는데,
          <br />
          다 같이 모일 곳은{" "}
          <span className="why-flip">
            <em className="why-was gradient-text">없었어요</em>
            <em className="why-now gradient-text">있어요</em>
          </span>
        </h2>

        <div className="why-beats" aria-live="polite">
          {BEATS.map((beat, i) => (
            <BeatView key={i} beat={beat} state={i === active ? "on" : i < active ? "past" : ""} />
          ))}
        </div>

        <div className="why-dots" aria-hidden>
          {BEATS.map((_, i) => (
            <span key={i} className={i === active ? "on" : ""} />
          ))}
        </div>
      </div>
    </section>
  );
}
