"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { fetchJson } from "@/lib/http";
import { ArchetypeTags } from "@/app/components/ArchetypeTags";

/* ── 타입 ─────────────────────────────────────────────────────────────────── */

type ReportData = {
  catchphrase: string;
  coreTraits: string;
  optimalEcosystem: string;
  corePosition: string;
};

type ReportResponse = {
  ok: true;
  saved: boolean;
  shareSlug?: string;
  reportData: ReportData;
};

/* ── 상수 ─────────────────────────────────────────────────────────────────── */

const PERSONALITY_TYPES = [
  ["INTJ", "INTP", "ENTJ", "ENTP"],
  ["INFJ", "INFP", "ENFJ", "ENFP"],
  ["ISTJ", "ISFJ", "ESTJ", "ESFJ"],
  ["ISTP", "ISFP", "ESTP", "ESFP"],
] as const;

/* ── 메인 컴포넌트 ────────────────────────────────────────────────────────── */

export function PromptSection() {
  const router = useRouter();

  const [step, setStep] = useState(0);       // 0:메인 2:로딩 3:결과 (1은 삭제됨)
  const [animKey, setAnimKey] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [shareSlug, setShareSlug] = useState<string | null>(null);

  function goTo(next: number) {
    setAnimKey((k) => k + 1);
    setStep(next);
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

  return (
    <div className="w-full">
      <div key={animKey} className="card-slide-in">
        {step === 0 && (
          <CardMain
            onPersonalitySelect={handlePersonalitySubmit}
            error={error}
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

/* ── 카드 1: 메인 (MBTI 기본) ──────────────────────────── */

function CardMain({
  onPersonalitySelect,
  error,
}: {
  onPersonalitySelect: (type: string) => void;
  error: string | null;
}) {
  return (
    <div className="glass-card glass-ribbon card-glow relative overflow-hidden p-6">
      <h2 className="text-xl font-extrabold tracking-tight text-ink">
        성격유형을 고르면 바로 시작해요
      </h2>
      <p className="mb-4 mt-1.5 text-[13px] font-medium text-ink-faint">
        자신의 MBTI를 선택해주세요.
      </p>

      {error && (
        <div className="mb-3 rounded-xl border border-red-300/60 bg-red-500/[0.08] px-4 py-2.5 text-center text-xs text-red-500">
          {error}
        </div>
      )}

      {/* MBTI 4×4 격자 */}
      <div className="space-y-2.5">
        {PERSONALITY_TYPES.map((row, rowIdx) => (
          <div key={rowIdx} className="grid grid-cols-4 gap-2.5">
            {row.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onPersonalitySelect(type)}
                className="rounded-xl border border-white/95 bg-white/60 py-3 text-[13px] font-bold tracking-[0.07em] text-ink shadow-[0_2px_10px_-3px_rgba(74,144,194,.18)] transition-all hover:-translate-y-[3px] hover:border-transparent hover:text-teal-deep hover:shadow-[0_12px_26px_-8px_rgba(53,195,180,.45)] hover:[background:linear-gradient(#fff,#fff)_padding-box,linear-gradient(120deg,#F0B429,#35C3B4)_border-box] active:-translate-y-px"
              >
                {type}
              </button>
            ))}
          </div>
        ))}
      </div>

      <p className="mt-5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2.5 text-center text-[13px] font-medium text-ink-soft">
        성격유형을 모른다면?
        <a
          href="https://www.16personalities.com/ko"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-gold inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs"
        >
          무료 검사하기 <span aria-hidden>↗</span>
        </a>
      </p>
    </div>
  );
}

/* ── 카드 3: 로딩 ─────────────────────────────────────────────────────────── */

function CardLoading() {
  return (
    <div className="glass-card flex min-h-72 flex-col items-center justify-center p-8 text-center">
      <div className="relative mb-6">
        <div className="h-14 w-14 animate-spin rounded-full border-2 border-gold/25 border-t-gold-deep" />
        <div className="absolute inset-0 rounded-full bg-gold/10 blur-lg" />
      </div>
      <p className="text-lg font-bold text-ink">분석 중이에요...</p>
      <p className="mt-2 text-sm text-ink-soft">성향 카드를 만들고 있어요</p>
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
      <div className="glass-card glass-ribbon relative overflow-hidden px-6 py-8 text-center">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-16 left-1/2 h-36 w-72 -translate-x-1/2 rounded-full bg-gold/20 blur-[60px]" />
        </div>

        <div className="relative">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold-ink">
            내 성향 카드
          </p>
          <h2 className="mb-4 text-2xl font-bold text-ink">
            &ldquo;
            <span className="gradient-text">
              {reportData.catchphrase}
            </span>
            &rdquo;
          </h2>

          <div className="mb-2">
            <ArchetypeTags coreTraits={reportData.coreTraits} />
          </div>
          <p className="mb-5 text-[11px] text-ink-faint">
            인물형을 눌러 나와 닮은 성경 인물을 확인해보세요
          </p>

          <p className="text-sm leading-relaxed text-ink-soft">
            {reportData.optimalEcosystem}
          </p>
        </div>
      </div>

      {/* 다음 단계 CTA */}
      <div className="glass-card px-6 py-7 text-center">
        <p className="mb-0.5 text-xs font-semibold uppercase tracking-widest text-teal-ink">
          다음 단계
        </p>
        <p className="mb-5 text-lg font-bold text-ink">
          이제 딱 맞는 동아리를 찾아드릴게요! 🎯
        </p>

        {shareSlug ? (
          <button
            type="button"
            onClick={() => router.push(`/report/${shareSlug}`)}
            className="btn-gold w-full rounded-xl py-4 text-sm font-bold"
          >
            성향 카드 전체 보기 →
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.push("/login?next=/report/pending")}
            className="btn-gold w-full rounded-xl py-4 text-sm font-bold"
          >
            로그인하고 성향 카드 저장하기 →
          </button>
        )}

        <p className="mt-3 text-xs text-ink-faint">
          성향 카드를 저장하면 언제든 다시 볼 수 있어요
        </p>
      </div>
    </div>
  );
}
