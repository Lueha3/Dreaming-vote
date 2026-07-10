"use client";

// 우편번호 조회 도구 — 화면 1개, 큰 버튼 2개. 로그인·업로드 없음.
// 워크플로우: 엑셀 열 복사 → 붙여넣기 → [변환하기] → [전체 복사] → 엑셀.
//
// 매칭은 클라이언트에서 바로 수행(샘플 DB 번들). 수만 건도 청크 처리 + 진행바로
// 브라우저를 멈추지 않고 처리한다. 운영 전국 DB 연동 시 /api/postal/convert 로 교체.

import { useMemo, useRef, useState } from "react";
import {
  MemoryStore,
  SAMPLE_RECORDS,
  convertLine,
  toTSV,
  failuresToTSV,
  summarize,
  type ConvertResult,
} from "@/lib/postal";

const CHUNK = 2000; // 한 프레임에 처리할 줄 수

const EXAMPLE = [
  "서울특별시 강남구 테헤란로 152",
  "서울 강남구 역삼동 737",
  "06236",
  "경기 성남시 분당구 불정로 6",
  "13561",
].join("\n");

export default function PostalPage() {
  const store = useMemo(() => new MemoryStore(SAMPLE_RECORDS), []);
  const [text, setText] = useState("");
  const [results, setResults] = useState<ConvertResult[]>([]);
  const [progress, setProgress] = useState(0); // 0~100
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState<"" | "all" | "fail">("");
  const runId = useRef(0);

  const summary = useMemo(() => summarize(results), [results]);

  function handleConvert() {
    const lines = text.replace(/\r\n?/g, "\n").split("\n");
    setResults([]);
    setProgress(0);
    setRunning(true);
    setCopied("");
    const myRun = ++runId.current;
    const out: ConvertResult[] = [];

    const step = (start: number) => {
      if (myRun !== runId.current) return; // 새 변환이 시작되면 중단
      const end = Math.min(start + CHUNK, lines.length);
      for (let i = start; i < end; i++) out.push(convertLine(lines[i], store));
      setProgress(Math.round((end / Math.max(lines.length, 1)) * 100));
      if (end < lines.length) {
        requestAnimationFrame(() => step(end));
      } else {
        setResults(out.slice());
        setRunning(false);
      }
    };
    requestAnimationFrame(() => step(0));
  }

  async function copy(kind: "all" | "fail") {
    const tsv = kind === "all" ? toTSV(results) : failuresToTSV(results);
    try {
      await navigator.clipboard.writeText(tsv);
      setCopied(kind);
      setTimeout(() => setCopied(""), 1600);
    } catch {
      // 클립보드 API 미지원 폴백: textarea 선택
      const ta = document.createElement("textarea");
      ta.value = tsv;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      setCopied(kind);
      setTimeout(() => setCopied(""), 1600);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.wrap}>
        <header style={styles.header}>
          <h1 style={styles.title}>우편번호 한번에 조회</h1>
          <p style={styles.sub}>
            주소를 붙여넣고 <b>변환하기</b>를 누르면 도로명·지번·우편번호가 한꺼번에
            나옵니다. 수천·수만 건도 한 번에 됩니다.
          </p>
        </header>

        {/* 1. 입력 */}
        <section style={styles.card}>
          <label style={styles.stepLabel}>
            <span style={styles.stepNum}>1</span> 여기에 주소를 붙여넣으세요
          </label>
          <textarea
            style={styles.textarea}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"한 줄에 주소 하나씩. 예)\n" + EXAMPLE}
            spellCheck={false}
          />
          <div style={styles.inputFoot}>
            <button
              type="button"
              style={styles.linkBtn}
              onClick={() => setText(EXAMPLE)}
            >
              예시 넣어보기
            </button>
            <span style={styles.count}>
              {text.trim() ? text.replace(/\r\n?/g, "\n").split("\n").length : 0}줄
            </span>
          </div>
          <button
            type="button"
            style={{ ...styles.bigBtn, ...(running ? styles.bigBtnBusy : {}) }}
            onClick={handleConvert}
            disabled={running || !text.trim()}
          >
            {running ? `변환 중… ${progress}%` : "변환하기"}
          </button>
          {running && (
            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressBar, width: `${progress}%` }} />
            </div>
          )}
        </section>

        {/* 2. 결과 */}
        {results.length > 0 && (
          <section style={styles.card}>
            <div style={styles.resultHead}>
              <label style={styles.stepLabel}>
                <span style={styles.stepNum}>2</span> 변환 결과
              </label>
              <div style={styles.stats}>
                <span style={styles.statOk}>성공 {summary.matched}</span>
                <span style={styles.statWarn}>여러건 {summary.ambiguous}</span>
                <span style={styles.statFail}>실패 {summary.unmatched}</span>
                <span style={styles.statRate}>매칭률 {summary.matchRate}%</span>
              </div>
            </div>

            <div style={styles.copyRow}>
              <button type="button" style={styles.copyBtn} onClick={() => copy("all")}>
                {copied === "all" ? "복사됨 ✓" : "전체 복사"}
              </button>
              <button
                type="button"
                style={{ ...styles.copyBtn, ...styles.copyBtnGhost }}
                onClick={() => copy("fail")}
                disabled={summary.unmatched + summary.ambiguous === 0}
              >
                {copied === "fail" ? "복사됨 ✓" : "실패만 복사"}
              </button>
              <span style={styles.copyHint}>엑셀에 붙여넣으면 열로 딱 맞게 들어갑니다</span>
            </div>

            <div style={styles.tableScroll}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>원본</th>
                    <th style={styles.th}>도로명주소</th>
                    <th style={styles.th}>지번주소</th>
                    <th style={styles.thZip}>우편번호</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <ResultRow key={i} r={r} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <footer style={styles.footer}>
          <p>
            ⚠️ 현재는 <b>샘플 데이터(데모)</b>로 동작합니다. 운영 배포 시 행정안전부
            도로명주소 전체분 DB를 연동하면 전국 수백만 건이 그대로 조회됩니다.
          </p>
        </footer>
      </div>
    </div>
  );
}

function ResultRow({ r }: { r: ConvertResult }) {
  const bg =
    r.status === "unmatched"
      ? "#FEECEC"
      : r.status === "ambiguous"
        ? "#FFF7E6"
        : r.status === "empty"
          ? "transparent"
          : "transparent";
  return (
    <tr style={{ background: bg }}>
      <td style={styles.td}>{r.input || " "}</td>
      <td style={styles.td}>
        {r.roadAddress || (r.status === "unmatched" ? <Fail note={r.note} /> : "")}
      </td>
      <td style={styles.td}>{r.jibunAddress}</td>
      <td style={styles.tdZip}>{r.zipcode}</td>
    </tr>
  );
}

function Fail({ note }: { note: string }) {
  return <span style={{ color: "#C0392B", fontSize: 13 }}>✗ {note || "찾지 못함"}</span>;
}

// ── 인라인 스타일(교회 앱 전역 CSS와 격리, 단독 도구 룩) ──
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#F4F6F8",
    padding: "24px 16px 64px",
    fontFamily:
      '-apple-system, "Segoe UI", "Malgun Gothic", Pretendard, sans-serif',
    color: "#1F2933",
  },
  wrap: { maxWidth: 960, margin: "0 auto", display: "grid", gap: 20 },
  header: { textAlign: "center", padding: "8px 0" },
  title: { fontSize: 30, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" },
  sub: { fontSize: 16, color: "#52606D", margin: "10px auto 0", maxWidth: 620, lineHeight: 1.55 },
  card: {
    background: "#fff",
    borderRadius: 18,
    padding: 22,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.05)",
  },
  stepLabel: { display: "flex", alignItems: "center", gap: 10, fontSize: 18, fontWeight: 700, marginBottom: 12 },
  stepNum: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 30, height: 30, borderRadius: "50%", background: "#2563EB", color: "#fff",
    fontSize: 16, fontWeight: 800,
  },
  textarea: {
    width: "100%", minHeight: 200, resize: "vertical", boxSizing: "border-box",
    border: "2px solid #D9E2EC", borderRadius: 12, padding: 14, fontSize: 16,
    lineHeight: 1.5, fontFamily: "inherit", outline: "none",
  },
  inputFoot: { display: "flex", justifyContent: "space-between", alignItems: "center", margin: "8px 2px 14px" },
  linkBtn: { background: "none", border: "none", color: "#2563EB", fontSize: 14, cursor: "pointer", padding: 0, textDecoration: "underline" },
  count: { fontSize: 14, color: "#7B8794" },
  bigBtn: {
    width: "100%", padding: "18px", fontSize: 20, fontWeight: 800, color: "#fff",
    background: "#2563EB", border: "none", borderRadius: 14, cursor: "pointer",
  },
  bigBtnBusy: { background: "#7B93C9", cursor: "wait" },
  progressTrack: { height: 8, background: "#E4E7EB", borderRadius: 4, marginTop: 12, overflow: "hidden" },
  progressBar: { height: "100%", background: "#2563EB", transition: "width 0.1s" },
  resultHead: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10 },
  stats: { display: "flex", gap: 8, flexWrap: "wrap", fontSize: 14, fontWeight: 700 },
  statOk: { color: "#0B7A3B", background: "#E3F9E5", padding: "4px 10px", borderRadius: 999 },
  statWarn: { color: "#8D6708", background: "#FFF7E6", padding: "4px 10px", borderRadius: 999 },
  statFail: { color: "#C0392B", background: "#FEECEC", padding: "4px 10px", borderRadius: 999 },
  statRate: { color: "#1F2933", background: "#E4E7EB", padding: "4px 10px", borderRadius: 999 },
  copyRow: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", margin: "16px 0" },
  copyBtn: { padding: "12px 22px", fontSize: 16, fontWeight: 700, color: "#fff", background: "#0B7A3B", border: "none", borderRadius: 10, cursor: "pointer" },
  copyBtnGhost: { background: "#fff", color: "#52606D", border: "2px solid #CBD2D9" },
  copyHint: { fontSize: 13, color: "#7B8794" },
  tableScroll: { overflowX: "auto", border: "1px solid #E4E7EB", borderRadius: 10 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { textAlign: "left", padding: "10px 12px", background: "#F4F6F8", borderBottom: "2px solid #E4E7EB", fontWeight: 700, whiteSpace: "nowrap", position: "sticky", top: 0 },
  thZip: { textAlign: "left", padding: "10px 12px", background: "#F4F6F8", borderBottom: "2px solid #E4E7EB", fontWeight: 700, whiteSpace: "nowrap", width: 96 },
  td: { padding: "9px 12px", borderBottom: "1px solid #EEF1F4", verticalAlign: "top" },
  tdZip: { padding: "9px 12px", borderBottom: "1px solid #EEF1F4", fontVariantNumeric: "tabular-nums", fontWeight: 700, whiteSpace: "nowrap" },
  footer: { textAlign: "center", fontSize: 13, color: "#7B8794", lineHeight: 1.6, padding: "0 8px" },
};
