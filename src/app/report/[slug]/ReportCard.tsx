"use client";

import { useState } from "react";
import { ClubRecommendations } from "./ClubRecommendations";

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

  async function handleShare(platform: "link_copy" | "kakao" | "instagram" | "twitter") {
    const url = `${window.location.origin}/report/${report.shareSlug}`;

    if (platform === "link_copy") {
      await navigator.clipboard.writeText(url);
      setShareStatus("링크 복사 완료!");
      setTimeout(() => setShareStatus(null), 2000);
    }

    fetch(`/api/reports/${report.shareSlug}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform }),
    }).catch(() => {});
  }

  // core traits를 배열로 변환
  const traits = report.coreTraits.split(/[,，、]/).map((t) => t.trim()).filter(Boolean);

  return (
    <div className="space-y-4">
      {/* 캐치프레이즈 헤더 카드 */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#141418] px-8 py-10 text-center">
        {/* 배경 glow */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-40 rounded-full bg-violet-600/15 blur-[60px]" />
        </div>

        <p className="relative mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          My Business Persona
        </p>
        <h1 className="relative text-2xl font-bold leading-tight text-white">
          &ldquo;
          <span className="bg-gradient-to-r from-violet-300 to-blue-300 bg-clip-text text-transparent">
            {report.catchphrase}
          </span>
          &rdquo;
        </h1>

        {/* 핵심 기질 배지들 */}
        {traits.length > 0 && (
          <div className="relative mt-5 flex flex-wrap items-center justify-center gap-2">
            {traits.map((trait, i) => (
              <span
                key={i}
                className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs text-violet-300"
              >
                {trait}
              </span>
            ))}
          </div>
        )}

        {/* 메타 정보 */}
        <div className="relative mt-5 flex items-center justify-center gap-3">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-500">
            {SOURCE_LABEL[report.sourceAi] ?? "AI"} 분석
          </span>
          <span className="text-xs text-zinc-700">·</span>
          <span className="text-xs text-zinc-600">
            조회 {report.viewCount}회
          </span>
        </div>
      </div>

      {/* 최적의 생태계 */}
      <Section
        icon="🌱"
        title="최적의 생태계"
        content={report.optimalEcosystem}
        accentColor="emerald"
      />

      {/* 핵심 포지션 */}
      <Section
        icon="⚡"
        title="핵심 포지션"
        content={report.corePosition}
        accentColor="violet"
      />

      {/* AI 동아리 추천 */}
      <ClubRecommendations reportId={report.id} shareSlug={report.shareSlug} />

      {/* 공유 */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#141418] p-5">
        <p className="mb-3 text-sm font-medium text-zinc-300">이 리포트 공유하기</p>
        <button
          onClick={() => handleShare("link_copy")}
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-zinc-300 transition-all hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-violet-300"
        >
          {shareStatus ?? "🔗 링크 복사"}
        </button>
        <p className="mt-3 text-center text-xs text-zinc-600">
          친구에게 공유하고 &ldquo;나도 해봐&rdquo;라고 말해보세요 🔥
        </p>
      </div>

      {/* CTA */}
      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-6 text-center">
        <p className="mb-3 text-sm font-medium text-zinc-300">
          나와 시너지 맞는 팀원을 찾고 싶다면?
        </p>
        <a
          href="/"
          className="inline-block rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 btn-glow"
        >
          내 리포트 만들기 →
        </a>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  content,
  accentColor,
}: {
  icon: string;
  title: string;
  content: string;
  accentColor: "emerald" | "violet";
}) {
  const accent =
    accentColor === "emerald"
      ? "border-emerald-500/15 bg-emerald-500/5"
      : "border-violet-500/15 bg-violet-500/5";

  return (
    <div className={`rounded-2xl border ${accent} bg-[#141418] p-5`}>
      <h2 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-zinc-200">
        <span>{icon}</span>
        {title}
      </h2>
      <p className="text-sm leading-relaxed text-zinc-400">{content}</p>
    </div>
  );
}
