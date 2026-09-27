"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { triggerHaptic } from "@/lib/haptics";

// Safari(특히 iOS)는 표준 Fullscreen API 대신 video 전용 API만 지원하는 경우가 있어 별도로 다룬다.
type VideoWithWebkitFullscreen = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
};

/**
 * 숨겨진 쇼릴 버튼 — 알림 벨 왼쪽의 작은 재생 아이콘. 안내·강조 문구 없이 조용히 둔다.
 *
 * <video autoPlay> 속성만으로는 브라우저가 "사용자 제스처로 시작됐다"고 인정하지 않아
 * 재생이 막히는 경우가 있어(엘리먼트가 클릭 핸들러 이후 커밋되며 삽입되기 때문), 클릭 시
 * ref로 직접 play()를 호출한다. 화면도 CSS 오버레이만으론 헤더 등 조상 레이어와의 z-index/
 * 컴포지팅 상호작용으로 실제 기기에서 안 덮이는 경우가 있어, 진짜 전체화면 API
 * (iOS는 webkitEnterFullscreen, 그 외는 requestFullscreen)를 함께 호출해 확실히 덮는다.
 * CSS 오버레이는 그 전까지의 짧은 틈과 API 미지원 브라우저를 위한 보강 장치로 남긴다.
 */
export function ShowreelButton() {
  const [open, setOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open) return;
    const v = videoRef.current as VideoWithWebkitFullscreen | null;
    if (!v) return;

    v.play().catch(() => {
      // 무음이 아니면 자동재생이 막힐 수 있어 — 무음으로라도 재생 상태에 들어간다(눌러서 소리 켜기 가능).
      v.muted = true;
      v.play().catch(() => {});
    });

    if (typeof v.webkitEnterFullscreen === "function") {
      v.webkitEnterFullscreen();
    } else if (v.requestFullscreen) {
      v.requestFullscreen().catch(() => {});
    }

    function onClose() {
      setOpen(false);
    }
    function onFullscreenChange() {
      if (!document.fullscreenElement) setOpen(false);
    }
    v.addEventListener("webkitendfullscreen", onClose);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      v.removeEventListener("webkitendfullscreen", onClose);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [open]);

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
            className="modal-fade-in fixed inset-0 z-[90] bg-black"
            onClick={() => setOpen(false)}
          >
            <video
              ref={videoRef}
              src="/showreel.mp4"
              poster="/showreel-poster.jpg"
              controls
              playsInline
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <button
              onClick={() => setOpen(false)}
              aria-label="닫기"
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl text-white backdrop-blur-sm transition-colors hover:bg-white/25"
            >
              ✕
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
