"use client";

import { useState } from "react";

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

export function ClubImageCarousel({ images, fullBleed, showCaption = true, initialIndex = 0 }: Props) {
  const [current, setCurrent] = useState(
    initialIndex >= 0 && initialIndex < images.length ? initialIndex : 0,
  );

  if (!images.length) return null;

  const prev = () => setCurrent((c) => Math.max(0, c - 1));
  const next = () => setCurrent((c) => Math.min(images.length - 1, c + 1));

  return (
    <div className={`${fullBleed ? "w-full" : "glass-card mb-6 overflow-hidden"}`}>
      {/* 이미지 영역 — 잘림 없이 전체 노출(object-contain) + 여백은 브랜드 그라데이션으로 융합 */}
      <div
        className={
          fullBleed
            ? "relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-skyx/30 to-teal/15 sm:aspect-[16/9]"
            : "relative overflow-hidden bg-skyx/15"
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[current].url}
          alt={images[current].caption || `카드 ${current + 1}`}
          className={`w-full object-contain ${fullBleed ? "h-full" : ""}`}
          style={fullBleed ? {} : { maxHeight: 420 }}
        />

        {/* 캡션 오버레이 */}
        {showCaption && images[current].caption && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white/95 via-white/75 to-transparent px-4 pb-4 pt-8">
            <p className="text-sm font-medium leading-relaxed text-ink">{images[current].caption}</p>
          </div>
        )}

        {/* 카운터 */}
        {images.length > 1 && (
          <div className="absolute right-3 top-3 rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium text-ink-soft backdrop-blur-sm">
            {current + 1} / {images.length}
          </div>
        )}

        {/* 화살표 */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              disabled={current === 0}
              className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-xl text-ink shadow-[0_4px_14px_-4px_rgba(74,144,194,.45)] backdrop-blur-sm transition-all hover:bg-white disabled:opacity-30"
            >
              ‹
            </button>
            <button
              onClick={next}
              disabled={current === images.length - 1}
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
    </div>
  );
}
