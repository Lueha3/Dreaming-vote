"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { triggerHaptic } from "@/lib/haptics";

/**
 * 숨겨진 쇼릴 버튼 — 알림 벨 왼쪽의 작은 재생 아이콘. 안내·강조 문구 없이 조용히 둔다.
 *
 * <video autoPlay> 속성만으로는 브라우저가 "사용자 제스처로 시작됐다"고 인정하지 않아
 * 재생이 막히는 경우가 있어(엘리먼트가 클릭 핸들러 이후 커밋되며 삽입되기 때문), 클릭 시
 * ref로 직접 play()를 호출한다.
 *
 * 화면은 네이티브 전체화면 API(webkitEnterFullscreen 등) 대신, video를 뷰포트 전체에
 * absolute+object-cover로 꽉 채우는 CSS만으로 처리한다 — 네이티브 API는 일부 iOS 버전에서
 * 불안정하게 동작할 수 있어(탭 크래시 사례 확인) 뺐다. 뷰어는 portal로 body에 붙여, 조상에
 * transform이 생겨도 항상 뷰포트 전체를 덮게 한다.
 */
export function ShowreelButton() {
  const [open, setOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open) return;
    const v = videoRef.current;
    if (!v) return;

    v.play().catch(() => {
      // 무음이 아니면 자동재생이 막힐 수 있어 — 무음으로라도 재생 상태에 들어간다(눌러서 소리 켜기 가능).
      v.muted = true;
      v.play().catch(() => {});
    });
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
