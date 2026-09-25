"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";

export type CarouselImage = {
  url: string;
  caption: string;
};

interface Props {
  images: CarouselImage[];
  fullBleed?: boolean;
  /** 캡션 오버레이 표시 여부. 히어로(이름 오버레이)에서는 false로 끈다. */
  showCaption?: boolean;
  /** 시작 인덱스 — 갤러리에서 특정 사진을 눌러 라이트박스를 열 때 사용. */
  initialIndex?: number;
}

/** 스와이프 판정 — 세로 스크롤과 헷갈리지 않게 가로 이동이 충분히 크고 세로보다 뚜렷할 때만 넘긴다. */
const SWIPE_THRESHOLD = 40;

export function ClubImageCarousel({
  images,
  fullBleed,
  showCaption = true,
  initialIndex = 0,
}: Props) {
  const [current, setCurrent] = useState(
    initialIndex >= 0 && initialIndex < images.length ? initialIndex : 0,
  );
  const [zoomOpen, setZoomOpen] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  if (!images.length) return null;

  const prev = () => setCurrent((c) => Math.max(0, c - 1));
  const next = () => setCurrent((c) => Math.min(images.length - 1, c + 1));

  function onTouchStart(e: React.TouchEvent) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) next();
      else prev();
    }
  }

  return (
    <div
      className={`${fullBleed ? "w-full" : "glass-card mb-6 overflow-hidden"}`}
    >
      {/* 이미지 영역 — 잘림 없이 전체 노출(object-contain) + 여백은 브랜드 그라데이션으로 융합 */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className={
          fullBleed
            ? "relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-skyx/30 to-teal/15 sm:aspect-[16/9]"
            : "relative overflow-hidden bg-skyx/15"
        }
      >
        <button
          type="button"
          onClick={() => setZoomOpen(true)}
          className={`block w-full cursor-zoom-in ${fullBleed ? "h-full" : ""}`}
          aria-label="원본 크게 보기"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[current].url}
            alt={images[current].caption || `카드 ${current + 1}`}
            className={`w-full object-contain ${fullBleed ? "h-full" : ""}`}
            style={fullBleed ? {} : { maxHeight: 420 }}
          />
        </button>

        {/* 캡션 오버레이 */}
        {showCaption && images[current].caption && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white/95 via-white/75 to-transparent px-4 pb-4 pt-8">
            <p className="text-sm font-medium leading-relaxed text-ink">
              {images[current].caption}
            </p>
          </div>
        )}

        {/* 카운터 */}
        {images.length > 1 && (
          <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium text-ink-soft backdrop-blur-sm">
            {current + 1} / {images.length}
          </div>
        )}

        {/* 화살표 */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              disabled={current === 0}
              aria-label="이전 사진"
              className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-xl text-ink shadow-[0_4px_14px_-4px_rgba(74,144,194,.45)] backdrop-blur-sm transition-all hover:bg-white disabled:opacity-30"
            >
              ‹
            </button>
            <button
              onClick={next}
              disabled={current === images.length - 1}
              aria-label="다음 사진"
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-xl text-ink shadow-[0_4px_14px_-4px_rgba(74,144,194,.45)] backdrop-blur-sm transition-all hover:bg-white disabled:opacity-30"
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* 점 인디케이터 */}
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 border-t border-sky-line bg-white/45 py-2.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all ${
                i === current
                  ? "h-1.5 w-5 bg-skyx-deep"
                  : "h-1.5 w-1.5 bg-skyx-deep/30 hover:bg-skyx-deep/50"
              }`}
            />
          ))}
        </div>
      )}

      {/* 원본 전체화면 뷰어 — 클릭 한 번으로 진입, 스와이프/화살표로 계속 넘겨볼 수 있음.
          portal로 body에 바로 붙여, 갤러리 모달(.modal-pop-in의 transform)에 갇히지 않고
          항상 뷰포트 전체를 덮게 한다. */}
      {zoomOpen &&
        createPortal(
          <div
            className="modal-fade-in fixed inset-0 z-[80] flex items-center justify-center bg-black/95"
            onClick={() => setZoomOpen(false)}
          >
            <div
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
              className="relative flex h-full w-full items-center justify-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[current].url}
                alt={images[current].caption || `카드 ${current + 1}`}
                className="max-h-full max-w-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />

              <button
                onClick={() => setZoomOpen(false)}
                aria-label="닫기"
                className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl text-white backdrop-blur-sm transition-colors hover:bg-white/25"
              >
                ✕
              </button>

              {images.length > 1 && (
                <>
                  <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    {current + 1} / {images.length}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      prev();
                    }}
                    disabled={current === 0}
                    aria-label="이전 사진"
                    className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-xl text-white backdrop-blur-sm transition-colors hover:bg-white/25 disabled:opacity-30"
                  >
                    ‹
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      next();
                    }}
                    disabled={current === images.length - 1}
                    aria-label="다음 사진"
                    className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-xl text-white backdrop-blur-sm transition-colors hover:bg-white/25 disabled:opacity-30"
                  >
                    ›
                  </button>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
