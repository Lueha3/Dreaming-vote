"use client";

import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type ViewerImage = { url: string; caption: string };

type Props = {
  images: ViewerImage[];
  initialIndex?: number;
  onClose: () => void;
  /** 사진이 바뀔 때마다 알려준다(인라인 캐러셀이 같은 사진에 머물도록 동기화하는 용도). */
  onIndexChange?: (index: number) => void;
  /** 좌상단 추가 액션(예: 사진 삭제). 지금 보고 있는 사진의 인덱스를 받는다. */
  renderActions?: (index: number) => ReactNode;
};

// 좌우로 이 거리(px) 이상 밀면 다음/이전 사진으로 넘어간다.
const SWIPE_NAV = 50;
// 이 거리(px) 이상 끌면 닫는다 — 위·아래는 항상, 좌우는 첫/마지막 사진에서 더 밀 때.
const DISMISS_DIST = 110;

const clampIdx = (i: number, len: number) => (i >= 0 && i < len ? i : 0);

/**
 * 전체화면 사진 뷰어 — 썸네일/캐러셀을 누르면 곧바로 이 화면이 열린다(중간 카드 단계 없음).
 * - 위·아래로 끌면 손가락을 따라오다 기준 거리를 넘기면 닫힌다(X 버튼과 같은 효과).
 * - 좌우로 끌면 사진을 넘기고, 첫/마지막 사진에서 더 밀면 닫힌다.
 * - portal로 body에 붙여, 조상에 transform이 있어도 항상 뷰포트 전체를 덮는다.
 * touch-action:none으로 브라우저 기본 스크롤을 막아 제스처를 전부 이 컴포넌트가 처리한다.
 */
export function PhotoViewer({ images, initialIndex = 0, onClose, onIndexChange, renderActions }: Props) {
  const [index, setIndex] = useState(() => clampIdx(initialIndex, images.length));
  const rootRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const touch = useRef<{ x: number; y: number; axis: "x" | "y" | null }>({ x: 0, y: 0, axis: null });

  if (images.length === 0) return null;
  const current = images[index] ?? images[0];

  function goTo(i: number) {
    setIndex(i);
    onIndexChange?.(i);
  }

  // animate=true면 원위치로 부드럽게 복귀, false면 즉시 초기화(사진이 바뀌는 순간).
  function resetDrag(animate: boolean) {
    const img = imgRef.current;
    if (img) {
      img.style.transition = animate ? "transform .22s ease, opacity .22s ease" : "none";
      img.style.transform = "";
      img.style.opacity = "";
    }
    if (rootRef.current) rootRef.current.style.backgroundColor = "";
  }

  function onTouchStart(e: React.TouchEvent) {
    const p = e.touches[0];
    touch.current = { x: p.clientX, y: p.clientY, axis: null };
  }

  function onTouchMove(e: React.TouchEvent) {
    const p = e.touches[0];
    const dx = p.clientX - touch.current.x;
    const dy = p.clientY - touch.current.y;
    // 손가락이 조금 움직인 뒤에야 방향을 확정한다 — 그 전엔 탭으로 본다.
    if (!touch.current.axis && Math.hypot(dx, dy) > 8) {
      touch.current.axis = Math.abs(dy) > Math.abs(dx) ? "y" : "x";
    }
    const img = imgRef.current;
    if (!touch.current.axis || !img) return;
    img.style.transition = "none";
    if (touch.current.axis === "y") {
      const k = Math.max(0, 1 - Math.abs(dy) / 450);
      img.style.transform = `translate3d(0, ${dy}px, 0)`;
      img.style.opacity = String(Math.max(0.4, k));
      if (rootRef.current) rootRef.current.style.backgroundColor = `rgba(0,0,0,${0.95 * k})`;
    } else {
      img.style.transform = `translate3d(${dx}px, 0, 0)`;
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    const axis = touch.current.axis;
    touch.current.axis = null;
    if (!axis) return; // 탭 — 뒤따르는 click(배경이면 닫기)이 처리
    // 드래그였으면 뒤따르는 ghost click이 배경 닫기로 새지 않게 막는다.
    if (e.cancelable) e.preventDefault();

    const p = e.changedTouches[0];
    const dx = p.clientX - touch.current.x;
    const dy = p.clientY - touch.current.y;

    if (axis === "y") {
      if (Math.abs(dy) > DISMISS_DIST) return onClose();
      return resetDrag(true);
    }

    const target = index + (dx < 0 ? 1 : -1); // 왼쪽으로 밀면 다음 사진
    const hasTarget = target >= 0 && target < images.length;
    if (hasTarget && Math.abs(dx) > SWIPE_NAV) {
      resetDrag(false);
      return goTo(target);
    }
    if (!hasTarget && Math.abs(dx) > DISMISS_DIST) return onClose();
    resetDrag(true);
  }

  const safeTop = "max(0.75rem, env(safe-area-inset-top))";

  return createPortal(
    <div
      ref={rootRef}
      className="modal-fade-in fixed inset-0 z-[80] flex items-center justify-center bg-black/95"
      style={{ touchAction: "none" }}
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={current.url}
        alt={current.caption || `사진 ${index + 1}`}
        draggable={false}
        className="max-h-full max-w-full select-none object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {current.caption && (
        <p
          className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-5 pb-6 pt-12 text-center text-sm font-medium leading-relaxed text-white"
          style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        >
          {current.caption}
        </p>
      )}

      <div className="absolute left-3" style={{ top: safeTop }} onClick={(e) => e.stopPropagation()}>
        {renderActions?.(index)}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="닫기"
        className="absolute right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl text-white backdrop-blur-sm transition-colors hover:bg-white/25"
        style={{ top: safeTop }}
      >
        ✕
      </button>

      {images.length > 1 && (
        <>
          <div
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm"
            style={{ top: safeTop }}
          >
            {index + 1} / {images.length}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goTo(index - 1);
            }}
            disabled={index === 0}
            aria-label="이전 사진"
            className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-xl text-white backdrop-blur-sm transition-colors hover:bg-white/25 disabled:opacity-30"
          >
            ‹
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goTo(index + 1);
            }}
            disabled={index === images.length - 1}
            aria-label="다음 사진"
            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-xl text-white backdrop-blur-sm transition-colors hover:bg-white/25 disabled:opacity-30"
          >
            ›
          </button>
        </>
      )}
    </div>,
    document.body,
  );
}
