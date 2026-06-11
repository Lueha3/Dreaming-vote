"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/http";
import { ArchetypeTags } from "@/app/components/ArchetypeTags";

/* ── 타입 ─────────────────────────────────────────────────────────────────── */

type PromptData = { version: string; content: string };

type ReportData = {
  catchphrase: string;
  coreTraits: string;
  optimalEcosystem: string;
  corePosition: string;
};

type PromptResponse = { ok: true; prompt: PromptData };
type ReportResponse = {
  ok: true;
  saved: boolean;
  shareSlug?: string;
  reportData: ReportData;
};

/* ── 상수 ─────────────────────────────────────────────────────────────────── */

const AI_OPTIONS = [
  { value: "chatgpt", label: "ChatGPT" },
  { value: "claude", label: "Claude" },
  { value: "gemini", label: "Gemini" },
  { value: "copilot", label: "Copilot" },
  { value: "other", label: "기타 AI" },
] as const;

const AI_URLS: Record<string, string> = {
  chatgpt: "https://chat.openai.com",
  claude: "https://claude.ai",
  gemini: "https://gemini.google.com",
  copilot: "https://copilot.microsoft.com",
  other: "https://chat.openai.com",
};

const PERSONALITY_TYPES = [
  ["INTJ", "INTP", "ENTJ", "ENTP"],
  ["INFJ", "INFP", "ENFJ", "ENFP"],
  ["ISTJ", "ISFJ", "ESTJ", "ESFJ"],
  ["ISTP", "ISFP", "ESTP", "ESFP"],
] as const;

/* ── 메인 컴포넌트 ────────────────────────────────────────────────────────── */

export function PromptSection() {
  const router = useRouter();

  const [step, setStep] = useState(0);       // 0:메인 1:붙여넣기 2:로딩 3:결과
  const [animKey, setAnimKey] = useState(0);

  const [prompt, setPrompt] = useState<PromptData | null>(null);
  const [promptError, setPromptError] = useState(false);
  const [sourceAi, setSourceAi] = useState("chatgpt");
  const [copied, setCopied] = useState(false);
  const [rawText, setRawText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [shareSlug, setShareSlug] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<PromptResponse>("/api/prompt/current")
      .then((data) => setPrompt(data.prompt))
      .catch(() => setPromptError(true));
  }, []);

  function goTo(next: number) {
    setAnimKey((k) => k + 1);
    setStep(next);
  }

  function goBack() {
    setAnimKey((k) => k + 1);
    setStep(step - 1);
    setError(null);
  }

  async function handleCopy() {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt.content);
    setCopied(true);
  }

  async function handlePersonalitySubmit(personalityType: string) {
    setError(null);
    goTo(2);

    try {
      const data = await fetchJson<ReportResponse>("/api/reports/personality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalityType }),
      });

      setReportData(data.reportData);
      if (data.shareSlug) setShareSlug(data.shareSlug);

      if (!data.saved) {
        sessionStorage.setItem(
          "bh_pending_report",
          JSON.stringify({ reportData: data.reportData, sourceAi: "personality" }),
        );
      }

      goTo(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다. 다시 시도해주세요.");
      goTo(0);
    }
  }

  async function handleSubmit() {
    if (!rawText.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    goTo(2);

    try {
      const data = await fetchJson<ReportResponse>("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: rawText.trim(), sourceAi }),
      });

      setReportData(data.reportData);
      if (data.shareSlug) setShareSlug(data.shareSlug);

      if (!data.saved) {
        sessionStorage.setItem(
          "bh_pending_report",
          JSON.stringify({ reportData: data.reportData, sourceAi }),
        );
      }

      goTo(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다. 다시 시도해주세요.");
      goTo(1);
    } finally {
      setSubmitting(false);
    }
  }

  const aiLabel = AI_OPTIONS.find((o) => o.value === sourceAi)?.label ?? "AI";
  const aiUrl = AI_URLS[sourceAi] ?? "https://chat.openai.com";

  return (
    <div className="w-full">
      {/* 진행 인디케이터 — AI 경로 step 1·2에서만 표시 */}
      {(step === 1 || step === 2) && (
        <div className="mb-6 flex items-center justify-center gap-1.5">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                  i < step
                    ? "bg-violet-600 text-white"
                    : i === step
                      ? "bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-500/30"
                      : "border border-white/10 bg-white/5 text-zinc-600"
                }`}
              >
                {i < step ? "✓" : i}
              </div>
              {i < 2 && (
                <div
                  className={`h-px w-6 sm:w-10 transition-colors duration-500 ${
                    i < step ? "bg-violet-600/40" : "bg-white/10"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div key={animKey} className="card-slide-in">
        {step === 0 && (
          <CardMain
            prompt={prompt}
            promptError={promptError}
            sourceAi={sourceAi}
            setSourceAi={setSourceAi}
            copied={copied}
            onCopy={handleCopy}
            onGoToPaste={() => goTo(1)}
            onPersonalitySelect={handlePersonalitySubmit}
            error={error}
            aiLabel={aiLabel}
            aiUrl={aiUrl}
          />
        )}
        {step === 1 && (
          <CardPaste
            rawText={rawText}
            setRawText={setRawText}
            aiLabel={aiLabel}
            error={error}
            onSubmit={handleSubmit}
            submitting={submitting}
            onBack={goBack}
          />
        )}
        {step === 2 && <CardLoading />}
        {step === 3 && reportData && (
          <CardResult
            reportData={reportData}
            shareSlug={shareSlug}
            router={router}
          />
        )}
      </div>
    </div>
  );
}

/* ── 카드 1: 메인 (MBTI 기본 + AI 확장) ──────────────────────────── */

function CardMain({
  prompt,
  promptError,
  sourceAi,
  setSourceAi,
  copied,
  onCopy,
  onGoToPaste,
  onPersonalitySelect,
  error,
  aiLabel,
  aiUrl,
}: {
  prompt: PromptData | null;
  promptError: boolean;
  sourceAi: string;
  setSourceAi: (v: string) => void;
  copied: boolean;
  onCopy: () => void;
  onGoToPaste: () => void;
  onPersonalitySelect: (type: string) => void;
  error: string | null;
  aiLabel: string;
  aiUrl: string;
}) {
  const [aiExpanded, setAiExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#111111] p-6 card-glow">
      {/* 기본 경로: MBTI */}
      <h2 className="mb-2 text-xl font-bold leading-snug text-white">
        성격유형을 고르면{" "}
        <span className="bg-gradient-to-r from-violet-300 to-blue-300 bg-clip-text text-transparent">
          바로 시작해요
        </span>
      </h2>
      <p className="mb-4 text-xs text-zinc-500">
        대충 골라도 괜찮아요 — 나중에 다시 만들 수 있어요
      </p>

      {error && (
        <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-center text-xs text-red-400">
          {error}
        </div>
      )}

      {/* MBTI 4×4 격자 */}
      <div className="space-y-2">
        {PERSONALITY_TYPES.map((row, rowIdx) => (
          <div key={rowIdx} className="grid grid-cols-4 gap-2">
            {row.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onPersonalitySelect(type)}
                className="rounded-xl border border-white/[0.07] bg-white/[0.03] py-2.5 text-xs font-bold text-zinc-400 transition-all hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-300 active:scale-95"
              >
                {type}
              </button>
            ))}
          </div>
        ))}
      </div>

      <p className="mt-3 text-center text-xs text-zinc-600">
        성격유형을 모른다면?{" "}
        <a
          href="https://www.16personalities.com/ko"
          target="_blank"
          rel="noopener noreferrer"
          className="text-violet-400 underline underline-offset-2 hover:text-violet-300"
        >
          무료 검사하기 ↗
        </a>
      </p>

      {/* 구분선 */}
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/[0.07]" />
        <span className="text-xs text-zinc-600">또는</span>
        <div className="h-px flex-1 bg-white/[0.07]" />
      </div>

      {/* AI 경로 접기/펼치기 */}
      <button
        type="button"
        onClick={() => setAiExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm text-zinc-400 transition-all hover:border-white/20 hover:text-zinc-200"
      >
        <span>ChatGPT 등 AI를 써봤다면 — 더 깊게 분석하기</span>
        <svg
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${aiExpanded ? "rotate-180" : ""}`}
          viewBox="0 0 12 12"
          fill="none"
        >
          <path
            d="M2 4L6 8L10 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {aiExpanded && (
        <div className="mt-3 space-y-3">
          {/* AI 선택 */}
          <div className="flex flex-wrap gap-2">
            {AI_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSourceAi(opt.value)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                  sourceAi === opt.value
                    ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white"
                    : "border border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* 질문 텍스트 */}
          <div className="max-h-44 overflow-y-auto rounded-xl border border-white/[0.06] bg-black/30 p-4">
            <pre className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-400">
              {promptError
                ? "질문을 불러오지 못했어요. 성격유형을 대신 선택해보세요."
                : (prompt?.content ?? "질문 불러오는 중...")}
            </pre>
          </div>

          {prompt?.version && (
            <p className="text-right text-xs text-zinc-700">{prompt.version}</p>
          )}

          {/* 복사 버튼 */}
          <button
            type="button"
            onClick={onCopy}
            disabled={!prompt || promptError}
            className={`w-full rounded-xl py-4 text-sm font-bold text-white transition-all disabled:opacity-40 ${
              copied
                ? "bg-emerald-600"
                : "bg-gradient-to-r from-violet-600 to-blue-600 hover:opacity-90 btn-glow"
            }`}
          >
            {copied ? "✓ 질문이 복사됐어요!" : "AI에게 보낼 질문 복사하기 →"}
          </button>

          {/* 복사 후: 2버튼 / 복사 전: 안내 문구 */}
          {copied ? (
            <div className="flex gap-2">
              <a
                href={aiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-xl border border-white/[0.07] bg-white/[0.04] py-3 text-center text-sm font-medium text-zinc-300 transition-all hover:border-white/20 hover:text-white"
              >
                {aiLabel} 열기 ↗
              </a>
              <button
                type="button"
                onClick={onGoToPaste}
                className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 btn-glow"
              >
                답변 붙여넣기 →
              </button>
            </div>
          ) : (
            !promptError && (
              <p className="text-center text-xs text-zinc-600">
                복사 후 {aiLabel}에 붙여넣고 답변을 받아오세요
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
}

/* ── 카드 2: AI 답변 붙여넣기 ──────────────────────────────────────── */

function CardPaste({
  rawText,
  setRawText,
  aiLabel,
  error,
  onSubmit,
  submitting,
  onBack,
}: {
  rawText: string;
  setRawText: (v: string) => void;
  aiLabel: string;
  error: string | null;
  onSubmit: () => void;
  submitting: boolean;
  onBack: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#111111] p-6 card-glow">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">
          2단계
        </p>
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          ← 이전으로
        </button>
      </div>

      <h2 className="mb-5 text-xl font-bold leading-snug text-white">
        {aiLabel}에서 받은 답변을{" "}
        <span className="bg-gradient-to-r from-violet-300 to-blue-300 bg-clip-text text-transparent">
          여기에 붙여넣어 보세요! 📋
        </span>
      </h2>

      <textarea
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        rows={9}
        autoFocus
        className="w-full rounded-xl border border-white/[0.07] bg-black/30 px-4 py-3 text-sm leading-relaxed text-zinc-300 placeholder-zinc-600 transition-colors focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
        placeholder={`${aiLabel}에서 받은 분석 결과를 전체 복사해서 여기에 붙여넣으세요...`}
      />

      {error && (
        <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={!rawText.trim() || submitting}
        className="mt-4 w-full rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 py-4 text-sm font-bold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 btn-glow"
      >
        분석 시작하기 →
      </button>

      <p className="mt-3 text-center text-xs text-zinc-600">
        원문은 저장되지 않습니다. 분석 결과만 저장됩니다.
      </p>
    </div>
  );
}

/* ── 카드 3: 로딩 ─────────────────────────────────────────────────────────── */

function CardLoading() {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-white/[0.07] bg-[#111111] p-8 text-center">
      <div className="relative mb-6">
        <div className="h-14 w-14 animate-spin rounded-full border-2 border-violet-500/20 border-t-violet-400" />
        <div className="absolute inset-0 rounded-full bg-violet-600/5 blur-lg" />
      </div>
      <p className="text-lg font-bold text-white">AI가 분석 중이에요...</p>
      <p className="mt-2 text-sm text-zinc-500">성향 카드를 만들고 있어요</p>
    </div>
  );
}

/* ── 카드 4: 결과 ─────────────────────────────────────────────────────────── */

function CardResult({
  reportData,
  shareSlug,
  router,
}: {
  reportData: ReportData;
  shareSlug: string | null;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <div className="space-y-4">
      {/* 성향 카드 결과 */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-[#111111] px-6 py-8 text-center">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 h-36 w-72 rounded-full bg-violet-600/18 blur-[60px]" />
        </div>

        <div className="relative">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-violet-400">
            내 성향 카드
          </p>
          <h2 className="mb-4 text-2xl font-bold text-white">
            &ldquo;
            <span className="bg-gradient-to-r from-violet-300 to-blue-300 bg-clip-text text-transparent">
              {reportData.catchphrase}
            </span>
            &rdquo;
          </h2>

          <div className="mb-2">
            <ArchetypeTags coreTraits={reportData.coreTraits} />
          </div>
          <p className="mb-5 text-[11px] text-zinc-600">
            인물형을 눌러 나와 닮은 성경 인물을 확인해보세요
          </p>

          <p className="text-sm leading-relaxed text-zinc-400">
            {reportData.optimalEcosystem}
          </p>
        </div>
      </div>

      {/* 다음 단계 CTA */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#111111] px-6 py-7 text-center">
        <p className="mb-0.5 text-xs font-semibold uppercase tracking-widest text-violet-400">
          다음 단계
        </p>
        <p className="mb-5 text-lg font-bold text-white">
          이제{" "}
          <span className="bg-gradient-to-r from-violet-300 to-blue-300 bg-clip-text text-transparent">
            AI
          </span>
          가 동아리를 추천해드릴게요! 🎯
        </p>

        {shareSlug ? (
          <button
            type="button"
            onClick={() => router.push(`/report/${shareSlug}`)}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 py-4 text-sm font-bold text-white transition-all hover:opacity-90 btn-glow"
          >
            성향 카드 전체 보기 →
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.push("/login?next=/report/pending")}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 py-4 text-sm font-bold text-white transition-all hover:opacity-90 btn-glow"
          >
            로그인하고 성향 카드 저장하기 →
          </button>
        )}

        <p className="mt-3 text-xs text-zinc-600">
          성향 카드를 저장하면 언제든 다시 볼 수 있어요
        </p>
      </div>
    </div>
  );
}
