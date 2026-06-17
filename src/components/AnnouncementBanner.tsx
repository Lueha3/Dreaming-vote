"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Banner = { id: string; title: string };

const DISMISS_KEY = "bh_dismissed_announcement";

/**
 * 홈 상단 공지 배너 — 최신 게시 공지 1건을 노출.
 * 정적 홈을 유지하기 위해 클라이언트에서 지연 로드한다(첫 페인트 비차단).
 * 닫으면 해당 공지 id를 localStorage에 저장해 같은 공지는 다시 띄우지 않는다.
 */
export function AnnouncementBanner() {
  const [item, setItem] = useState<Banner | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/announcements?limit=1", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!alive || !j?.ok || !j.items?.length) return;
        const top = j.items[0];
        if (localStorage.getItem(DISMISS_KEY) === top.id) return;
        setItem({ id: top.id, title: top.title });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!item) return null;
  const current = item;

  return (
    <div className="mb-5">
      <div className="glass-soft flex items-center gap-2 rounded-2xl px-4 py-2.5 shadow-[0_8px_24px_-12px_rgba(74,144,194,.25)]">
        <span className="shrink-0 text-sm" aria-hidden>
          📢
        </span>
        <Link
          href="/notices"
          className="min-w-0 flex-1 truncate text-sm font-medium text-ink transition-colors hover:text-skyx-ink"
        >
          {current.title}
        </Link>
        <Link
          href="/notices"
          className="shrink-0 text-xs font-medium text-skyx-ink hover:underline"
        >
          전체보기
        </Link>
        <button
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, current.id);
            setItem(null);
          }}
          aria-label="공지 닫기"
          className="shrink-0 text-ink-faint transition-colors hover:text-ink"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 3L13 13M13 3L3 13"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
