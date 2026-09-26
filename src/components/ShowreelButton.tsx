"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { triggerHaptic } from "@/lib/haptics";

/**
 * 숨겨진 쇼릴 버튼 — 알림 벨 왼쪽의 작은 재생 아이콘. 안내·강조 문구 없이 조용히 둔다.
 * 클릭(=사용자 제스처) 직후 마운트되는 <video autoPlay>라 대부분 브라우저에서 소리까지 자동재생된다.
 * 뷰어는 portal로 body에 붙여, 조상에 transform이 생겨도 항상 뷰포트 전체를 덮게 한다.
 */
export function ShowreelButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          triggerHaptic();
          setOpen(true);
        }}
        className="glass-soft flex h-9 w-9 items-center justify-center rounded-xl text-ink-soft transition-colors hover:text-skyx-ink"
        aria-label="영상"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.7" />
          <path d="M10 8.3v7.4l6.2-3.7-6.2-3.7Z" fill="currentColor" />
        </svg>
      </button>

      {open &&
        createPortal(
          <div
            className="modal-fade-in fixed inset-0 z-[90] flex items-center justify-center bg-black/95"
            onClick={() => setOpen(false)}
          >
            <div
              className="relative flex h-full w-full items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <video
                src="/showreel.mp4"
                poster="/showreel-poster.jpg"
                autoPlay
                controls
                playsInline
                className="max-h-full max-w-full"
              />
              <button
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl text-white backdrop-blur-sm transition-colors hover:bg-white/25"
              >
                ✕
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
