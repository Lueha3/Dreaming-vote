"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { parseTraits, type BibleArchetype } from "@/lib/bibleArchetypes";

/**
 * 성향 카드의 성경 인물형 태그 묶음.
 * - 아키타입이면 이모지+라벨 버튼 → 클릭 시 인물 설명 모달
 * - 아키타입이 아니면(레거시 키워드) 일반 태그로 폴백
 */
export function ArchetypeTags({
  coreTraits,
  size = "md",
}: {
  coreTraits: string;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState<BibleArchetype | null>(null);
  const tokens = parseTraits(coreTraits);
  if (tokens.length === 0) return null;

  const pad = size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-xs";

  return (
    <>
      <div className="flex flex-wrap justify-center gap-1.5">
        {tokens.map(({ token, archetype }, i) =>
          archetype ? (
            <button
              key={i}
              type="button"
              onClick={() => setOpen(archetype)}
              className={`group inline-flex items-center gap-1 rounded-full border border-violet-500/25 bg-violet-500/[0.1] ${pad} font-medium text-violet-300 transition-all hover:border-violet-400/50 hover:bg-violet-500/20 hover:text-violet-200 active:scale-95`}
            >
              <span className="leading-none">{archetype.emoji}</span>
              {archetype.label}
              <span className="text-violet-400/50 transition-colors group-hover:text-violet-300/80">
                ⌄
              </span>
            </button>
          ) : (
            <span
              key={i}
              className={`rounded-full border border-violet-500/20 bg-violet-500/[0.08] ${pad} text-violet-300`}
            >
              {token}
            </span>
          ),
        )}
      </div>
      {open && <ArchetypeModal archetype={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function ArchetypeModal({
  archetype,
  onClose,
}: {
  archetype: BibleArchetype;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  // ESC 닫기 + 배경 스크롤 잠금 + 포털 마운트
  useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!mounted) return null;

  // transform 잔존 ancestor(.card-slide-in)·overflow-hidden에 갇히지 않도록 body로 포털
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm modal-fade-in" />
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-violet-500/25 bg-[#121212] p-7 text-left shadow-2xl shadow-violet-900/30 modal-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 h-36 w-72 rounded-full bg-violet-600/15 blur-[60px]" />
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200"
        >
          ✕
        </button>

        {/* 인물 헤더 */}
        <div className="relative text-center">
          <div className="mb-3 text-5xl leading-none">{archetype.emoji}</div>
          <h3 className="text-xl font-bold text-white">{archetype.figure}</h3>
          <p className="mt-1 text-sm font-medium text-violet-300">{archetype.type}</p>
        </div>

        {/* 인물 설명 */}
        <p className="relative mt-5 text-sm leading-relaxed text-zinc-300">
          {archetype.blurb}
        </p>

        {/* 연결 문구 */}
        <div className="relative mt-4 rounded-2xl border border-violet-500/20 bg-violet-500/[0.08] px-4 py-3.5">
          <p className="text-sm leading-relaxed text-violet-200">
            <span className="mr-1">💜</span>
            {archetype.connect}
          </p>
        </div>

        {/* 본문 출처 */}
        <p className="relative mt-4 text-center text-xs text-zinc-600">
          📖 {archetype.scripture}
        </p>
      </div>
    </div>,
    document.body,
  );
}
