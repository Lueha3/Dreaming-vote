"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { triggerHaptic } from "@/lib/haptics";

// 네이티브 컨트롤이 조작 없이 사라지는 시간과 맞춘 값 — 정확한 값을 알 수 없어 넉넉히 잡는다.
const CONTROLS_FADE_MS = 3000;

/**
 * 실제 뷰어 — open이 true가 될 때마다 새로 마운트되므로 chromeVisible이 항상 true로 시작한다
 * (effect에서 직접 리셋할 필요가 없다).
 */
function ShowreelViewer({ onClose }: { onClose: () => void }) {
  const [chromeVisible, setChromeVisible] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    // <video autoPlay> 속성만으로는 브라우저가 "사용자 제스처로 시작됐다"고 인정하지 않아
    // 재생이 막히는 경우가 있어(엘리먼트가 클릭 핸들러 이후 커밋되며 삽입되기 때문), 마운트 시
    // ref로 직접 play()를 호출한다.
    v.play().catch(() => {
      // 무음이 아니면 자동재생이 막힐 수 있어 — 무음으로라도 재생 상태에 들어간다(눌러서 소리 켜기 가능).
      v.muted = true;
      v.play().catch(() => {});
    });

    fadeTimer.current = setTimeout(() => setChromeVisible(false), CONTROLS_FADE_MS);
    return () => {
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, []);

  // 네이티브 컨트롤과 같은 리듬으로 탭할 때마다 토글 — 다시 보이면 같은 시간 뒤 다시 사라진다.
  function toggleChrome() {
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    setChromeVisible((v) => {
      const next = !v;
      if (next) fadeTimer.current = setTimeout(() => setChromeVisible(false), CONTROLS_FADE_MS);
      return next;
    });
  }

  return createPortal(
    <div className="modal-fade-in fixed inset-0 z-[90] bg-black" onClick={onClose}>
      <video
        ref={videoRef}
        src="/showreel.mp4"
        poster="/showreel-poster.jpg"
        controls
        playsInline
        onClick={(e) => {
          e.stopPropagation();
          toggleChrome();
        }}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {chromeVisible && (
        <button
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl text-white backdrop-blur-sm transition-colors hover:bg-white/25"
        >
          ✕
        </button>
      )}
    </div>,
    document.body,
  );
}

/**
 * 숨겨진 쇼릴 버튼 — 알림 벨 왼쪽의 작은 재생 아이콘. 안내·강조 문구 없이 조용히 둔다.
 * 뷰어는 portal로 body에 붙여, 조상에 transform이 생겨도 항상 뷰포트 전체를 덮게 한다.
 *
 * 전체화면은 네이티브 API(webkitEnterFullscreen 등) 대신 video를 뷰포트 전체에
 * absolute+object-cover로 꽉 채우는 CSS만으로 처리한다 — 네이티브 API는 일부 iOS 버전에서
 * 불안정하게 동작할 수 있어(탭 크래시 사례 확인) 쓰지 않는다.
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

      {open && <ShowreelViewer onClose={() => setOpen(false)} />}
    </>
  );
}
