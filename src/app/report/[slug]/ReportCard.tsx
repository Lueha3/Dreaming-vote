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
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111111] px-8 py-10 text-center">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-80 rounded-full bg-violet-600/12 blur-[60px]" />
        </div>
        <p className="relative mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-600">
          내 성향 카드
        </p>
        <h1 className="relative text-2xl font-bold leading-tight text-white">
          &ldquo;
          <span className="bg-gradient-to-r from-violet-300 to-blue-300 bg-clip-text text-transparent">
            {report.catchphrase}
          </span>
          &rdquo;
        </h1>
        <div className="relative mt-5">
          <ArchetypeTags coreTraits={report.coreTraits} />
        </div>
        <p className="relative mt-2 text-[11px] text-zinc-600">
          인물형을 눌러 나와 닮은 성경 인물을 확인해보세요
        </p>
        <div className="relative mt-5 flex items-center justify-center gap-3">
          <span className="rounded-full border border-white/[0.07] bg-white/[0.04] px-3 py-1 text-xs text-zinc-500">
            {SOURCE_LABEL[report.sourceAi] ?? "AI"} 분석
          </span>
          <span className="text-zinc-700">·</span>
          <span className="text-xs text-zinc-600">조회 {report.viewCount}회</span>
        </div>
      </div>

      {/* 최적의 생태계 */}
      <Section icon="🌱" label="최적의 생태계" content={report.optimalEcosystem} />

      {/* 핵심 포지션 */}
      <Section icon="⚡" label="핵심 포지션" content={report.corePosition} />

      {/* AI 동아리 추천 */}
      <ClubRecommendations reportId={report.id} shareSlug={report.shareSlug} />

      {/* 공유 */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#111111] p-5">
        <p className="mb-3 text-sm font-medium text-zinc-300">이 성향 카드 공유하기</p>
        <button
          onClick={handleShare}
          className="w-full rounded-xl border border-white/[0.07] bg-white/[0.04] py-2.5 text-sm font-medium text-zinc-400 transition-all hover:border-violet-500/30 hover:bg-violet-500/[0.07] hover:text-violet-300"
        >
          {shareStatus ?? "🔗 링크 복사"}
        </button>
        <p className="mt-3 text-center text-xs text-zinc-600">
          친구에게 공유하고 &ldquo;나도 해봐&rdquo;라고 말해보세요 🔥
        </p>
      </div>

      {/* CTA */}
      <div className="rounded-2xl border border-violet-500/15 bg-violet-500/[0.04] p-6 text-center">
        <p className="mb-3 text-sm text-zinc-400">나와 시너지 맞는 팀원을 찾고 싶다면?</p>
        <a
          href="/"
          className="inline-block rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 btn-glow"
        >
          나도 성향 카드 만들기 →
        </a>
      </div>
    </div>
  );
}

function Section({ icon, label, content }: { icon: string; label: string; content: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#111111] p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-200">
        <span className="text-base leading-none">{icon}</span>
        {label}
      </h2>
      <p className="text-sm leading-relaxed text-zinc-400">{content}</p>
    </div>
  );
}
