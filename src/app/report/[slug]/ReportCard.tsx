"use client";

import { useState } from "react";
import { ClubRecommendations } from "./ClubRecommendations";
import { ArchetypeTags } from "@/app/components/ArchetypeTags";

type Report = {
  id: string;
  shareSlug: string;
  catchphrase: string;
  coreTraits: string;
  optimalEcosystem: string;
  corePosition: string;
  sourceAi: string;
  viewCount: number;
  createdAt: Date;
  user: { nickname: string | null } | null;
};

const SOURCE_LABEL: Record<string, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  other: "AI",
};

export function ReportCard({ report }: { report: Report }) {
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  async function handleShare() {
    const url = `${window.location.origin}/report/${report.shareSlug}`;
    await navigator.clipboard.writeText(url);
    setShareStatus("복사됨!");
    setTimeout(() => setShareStatus(null), 2000);
    fetch(`/api/reports/${report.shareSlug}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "link_copy" }),
    }).catch(() => {});
  }

  return (
    <div className="space-y-3">
      {/* 캐치프레이즈 */}
      <div className="glass-card glass-ribbon relative overflow-hidden px-8 py-10 text-center">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-80 rounded-full bg-gold/15 blur-[60px]" />
        </div>
        <p className="relative mb-1 text-[11px] font-semibold text-ink-faint">
          나와 닮은 성경 인물은!?
        </p>
        <p className="relative mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-faint">
          내 성향 카드
        </p>
        <h1 className="relative text-2xl font-bold leading-tight text-ink">
          &ldquo;
          <span className="gradient-text">
            {report.catchphrase}
          </span>
          &rdquo;
        </h1>
        <div className="relative mt-5">
          <ArchetypeTags coreTraits={report.coreTraits} />
        </div>
        <p className="relative mt-2 text-[11px] text-ink-faint">
          아이콘을 눌러 인물들이 나와 어떤 점이 닮아있는지 확인해볼까요?
        </p>
        <div className="relative mt-5 flex items-center justify-center gap-3">
          <span className="glass-soft rounded-full px-3 py-1 text-xs text-ink-soft">
            {SOURCE_LABEL[report.sourceAi] ?? "AI"} 분석
          </span>
          <span className="text-ink-faint">·</span>
          <span className="text-xs text-ink-faint">조회 {report.viewCount}회</span>
        </div>
      </div>

      {/* 최적의 생태계 */}
      <Section icon="🌱" label="최적의 생태계" content={report.optimalEcosystem} />

      {/* 핵심 포지션 */}
      <Section icon="⚡" label="핵심 포지션" content={report.corePosition} />

      {/* AI 동아리 추천 */}
      <ClubRecommendations reportId={report.id} shareSlug={report.shareSlug} />

      {/* 공유 */}
      <div className="glass-card p-5">
        <p className="mb-3 text-sm font-medium text-ink">이 성향 카드 공유하기</p>
        <button
          onClick={handleShare}
          className="glass-soft w-full rounded-xl py-2.5 text-sm font-medium text-ink-soft transition-all hover:border-teal/40 hover:bg-white/90 hover:text-teal-ink"
        >
          {shareStatus ?? "🔗 링크 복사"}
        </button>
        <p className="mt-3 text-center text-xs text-ink-faint">
          친구에게 공유하고 &ldquo;너도 해봐&rdquo;라고 말해보세요 🔥
        </p>
      </div>

    </div>
  );
}

function Section({ icon, label, content }: { icon: string; label: string; content: string }) {
  return (
    <div className="glass-card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="text-base leading-none">{icon}</span>
        {label}
      </h2>
      <p className="text-sm leading-relaxed text-ink-soft">{content}</p>
    </div>
  );
}
