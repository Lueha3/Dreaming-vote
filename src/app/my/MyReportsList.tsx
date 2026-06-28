"use client";

import Link from "next/link";
import { useState } from "react";
import { parseTraits } from "@/lib/bibleArchetypes";

export type ReportItem = {
  shareSlug: string;
  catchphrase: string;
  coreTraits: string;
  sourceAi: string;
  viewCount: number;
  createdAt: string; // ISO
  isPublic: boolean;
};

const SOURCE_LABEL: Record<string, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  personality: "성격유형",
  other: "AI",
};

/**
 * 내 성향 카드 리스트 — 공개/비공개 토글만 클라이언트 상호작용.
 * 초기 목록은 서버 컴포넌트(/my)에서 SSR로 받아 props로 주입(클라 페치 워터폴 제거).
 */
export function MyReportsList({ initialItems }: { initialItems: ReportItem[] }) {
  const [items, setItems] = useState(initialItems);

  if (items.length === 0) return <EmptyState />;

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <ReportListItem
          key={item.shareSlug}
          item={item}
          onVisibilityChange={(slug, isPublic) =>
            setItems((prev) => prev.map((r) => (r.shareSlug === slug ? { ...r, isPublic } : r)))
          }
        />
      ))}
    </ul>
  );
}

function ReportListItem({
  item,
  onVisibilityChange,
}: {
  item: ReportItem;
  onVisibilityChange: (slug: string, isPublic: boolean) => void;
}) {
  const [toggling, setToggling] = useState(false);
  const traits = parseTraits(item.coreTraits);

  async function toggleVisibility(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setToggling(true);
    const next = !item.isPublic;
    await fetch(`/api/reports/${item.shareSlug}/visibility`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: next }),
    });
    onVisibilityChange(item.shareSlug, next);
    setToggling(false);
  }

  return (
    <li className="glass-card transition-all hover:border-teal/40">
      <Link href={`/report/${item.shareSlug}`} className="group block p-5">
        {/* 캐치프레이즈 */}
        <p className="font-semibold text-ink transition-colors group-hover:text-teal-ink">
          &ldquo;
          <span className="gradient-text">{item.catchphrase}</span>
          &rdquo;
        </p>
        {traits.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {traits.map(({ token, archetype }, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full border border-gold/35 bg-gold/10 px-2.5 py-0.5 text-xs text-gold-ink"
              >
                {archetype && <span className="leading-none">{archetype.emoji}</span>}
                {archetype?.label ?? token}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink-faint">
          <span className="glass-soft rounded-full px-2.5 py-0.5 text-ink-soft">
            {SOURCE_LABEL[item.sourceAi] ?? "AI"} 분석
          </span>
          <span>👁 {item.viewCount}</span>
          <span>
            {new Date(item.createdAt).toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })}
          </span>
        </div>
      </Link>

      {/* 공개/비공개 토글 */}
      <div className="flex items-center justify-between border-t border-sky-line px-5 py-3">
        <span className="text-xs text-ink-faint">공개 설정</span>
        <button
          onClick={toggleVisibility}
          disabled={toggling}
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50 ${
            item.isPublic
              ? "border border-teal/35 bg-teal/10 text-teal-ink hover:bg-teal/20"
              : "glass-soft text-ink-faint hover:text-ink"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${item.isPublic ? "bg-teal" : "bg-ink-faint"}`} />
          {item.isPublic ? "공개" : "비공개"}
        </button>
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="glass-card px-8 py-14 text-center">
      <div className="mb-4 text-4xl">✨</div>
      <p className="mb-2 font-semibold text-ink">아직 성향 카드가 없어요</p>
      <p className="mb-7 text-sm leading-relaxed text-ink-soft">첫 성향 카드를 만들어볼까요?</p>
      <Link
        href="/start"
        className="btn-gold inline-block rounded-full px-6 py-2.5 text-sm font-semibold btn-glow"
      >
        첫 성향 카드 만들기 →
      </Link>
    </div>
  );
}
