"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/http";

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

const PERSONALITY_TYPES = [
  ["INTJ", "INTP", "ENTJ", "ENTP"],
  ["INFJ", "INFP", "ENFJ", "ENFP"],
  ["ISTJ", "ISFJ", "ESTJ", "ESFJ"],
  ["ISTP", "ISFP", "ESTP", "ESFP"],
] as const;

/* ── 메인 컴포넌트 ────────────────────────────────────────────────────────── */

export function PromptSection() {
  const router = useRouter();

  const [step, setStep] = useState(0);       // 0:복사 1:붙여넣기 2:로딩 3:결과
  const [animKey, setAnimKey] = useState(0); // 변경 시 슬라이드 애니메이션 재시작

  const [prompt, setPrompt] = useState<PromptData | null>(null);
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
      .catch(() => {});
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
    setTimeout(() => {
      setCopied(false);
      goTo(1);
    }, 1200);
  }

  async function handlePersonalitySubmit(personalityType: string) {
    setError(null);
    goTo(2); // 로딩으로 바로 이동

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

      // 비로그인이면 pending 저장
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

  return (
    <div className="w-full">
      {/* 진행 인디케이터 (결과 화면에선 숨김) */}
      {step < 3 && (
        <div className="mb-6 flex items-center justify-center gap-1.5">
          {[0, 1, 2].map((i) => (
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
                {i < step ? "✓" : i + 1}
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

      {/* 슬라이드 카드 — key가 바뀔 때마다 slide-in 애니메이션 재실행 */}
      <div key={animKey} className="card-slide-in">
        {step === 0 && (
          <CardCopy
            prompt={prompt}
            sourceAi={sourceAi}
            setSourceAi={setSourceAi}
            copied={copied}
            onCopy={handleCopy}
            onPersonalitySelect={handlePersonalitySubmit}
            error={error}
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

/* ── 카드 1: 프롬프트 복사 ────────────────────────────────────────────────── */

function CardCopy({
  prompt,
  sourceAi,
  setSourceAi,
  copied,
  onCopy,
  onPersonalitySelect,
  error,
}: {
  prompt: PromptData | null;
  sourceAi: string;
  setSourceAi: (v: string) => void;
  copied: boolean;
  onCopy: () => void;
  onPersonalitySelect: (type: string) => void;
  error: string | null;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#111111] p-6 card-glow">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-violet-400">
        Step 1
      </p>
      <h2 className="mb-5 text-xl font-bold leading-snug text-white">
        아래 프롬프트를 복사해서{" "}
        <span className="bg-gradient-to-r from-violet-300 to-blue-300 bg-clip-text text-transparent">
          가장 자주 쓰는 AI에 붙여넣으세요!
        </span>
      </h2>

      {/* AI 선택 */}
      <div className="mb-4 flex flex-wrap gap-2">
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

      {/* 프롬프트 텍스트 */}
      <div className="mb-3 max-h-44 overflow-y-auto rounded-xl border border-white/[0.06] bg-black/30 p-4">
        <pre className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-400">
          {prompt?.content ?? "프롬프트 불러오는 중..."}
        </pre>
      </div>

      {prompt?.version && (
        <p className="mb-3 text-right text-xs text-zinc-700">{prompt.version}</p>
      )}

      <button
        type="button"
        onClick={onCopy}
        disabled={!prompt}
        className={`w-full rounded-xl py-4 text-sm font-bold text-white transition-all disabled:opacity-40 ${
          copied
            ? "bg-emerald-600"
            : "bg-gradient-to-r from-violet-600 to-blue-600 hover:opacity-90 btn-glow"
        }`}
      >
        {copied
          ? "✓ 복사 완료! 다음 단계로 이동 중..."
          : "프롬프트 복사하기 →"}
      </button>

      <p className="mt-3 text-center text-xs text-zinc-600">
        복사 후 {AI_OPTIONS.find((o) => o.value === sourceAi)?.label ?? "AI"}에
        붙여넣고 답변을 받아오세요
      </p>

      {/* 구분선 */}
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/[0.07]" />
        <span className="text-xs text-zinc-600">또는</span>
        <div className="h-px flex-1 bg-white/[0.07]" />
      </div>

      {/* 성격 유형 선택 */}
      <div>
        <p className="mb-3 text-center text-xs text-zinc-500">
          자주 쓰는 AI가 없다면?{" "}
          <span className="font-medium text-zinc-400">내 성격 유형 선택하기</span>
        </p>

        {error && (
          <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-center text-xs text-red-400">
            {error}
          </div>
        )}

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
      </div>
    </div>
  );
}

/* ── 카드 2: 결과 붙여넣기 ────────────────────────────────────────────────── */

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
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">
            Step 2
          </p>
        </div>
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
      {/* 스피너 */}
      <div className="relative mb-6">
        <div className="h-14 w-14 animate-spin rounded-full border-2 border-violet-500/20 border-t-violet-400" />
        <div className="absolute inset-0 rounded-full bg-violet-600/5 blur-lg" />
      </div>
      <p className="text-lg font-bold text-white">PARAN AI가 분석 중이에요...</p>
      <p className="mt-2 text-sm text-zinc-500">
        나만의 비즈니스 페르소나를 찾고 있습니다
      </p>
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
  const traits = reportData.coreTraits
    .split(/[,，、]/)
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <div className="space-y-4">
      {/* 페르소나 결과 카드 */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-[#111111] px-6 py-8 text-center">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 h-36 w-72 rounded-full bg-violet-600/18 blur-[60px]" />
        </div>

        <div className="relative">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-violet-400">
            당신의 비즈니스 페르소나
          </p>
          <h2 className="mb-4 text-2xl font-bold text-white">
            &ldquo;
            <span className="bg-gradient-to-r from-violet-300 to-blue-300 bg-clip-text text-transparent">
              {reportData.catchphrase}
            </span>
            &rdquo;
          </h2>

          <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
            {traits.map((t, i) => (
              <span
                key={i}
                className="rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300"
              >
                {t}
              </span>
            ))}
          </div>

          <p className="text-sm leading-relaxed text-zinc-400">
            {reportData.optimalEcosystem}
          </p>
        </div>
      </div>

      {/* PARAN AI 추천 CTA */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#111111] px-6 py-7 text-center">
        <p className="mb-0.5 text-xs font-semibold uppercase tracking-widest text-violet-400">
          Next Step
        </p>
        <p className="mb-5 text-lg font-bold text-white">
          이제{" "}
          <span className="bg-gradient-to-r from-violet-300 to-blue-300 bg-clip-text text-transparent">
            PARAN AI
          </span>
          가 동아리를 추천해드릴게요! 🎯
        </p>

        {shareSlug ? (
          <button
            type="button"
            onClick={() => router.push(`/report/${shareSlug}`)}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 py-4 text-sm font-bold text-white transition-all hover:opacity-90 btn-glow"
          >
            전체 리포트 보기 →
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.push("/login?next=/report/pending")}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 py-4 text-sm font-bold text-white transition-all hover:opacity-90 btn-glow"
          >
            로그인으로 리포트 저장하기 →
          </button>
        )}

        <p className="mt-3 text-xs text-zinc-600">
          리포트를 저장하면 언제든 다시 볼 수 있어요
        </p>
      </div>
    </div>
  );
}
