"use client";

import { useState } from "react";

export type CarouselImage = {
  url: string;
  caption: string;
};

interface Props {
  images: CarouselImage[];
}

export function ClubImageCarousel({ images }: Props) {
  const [current, setCurrent] = useState(0);

  if (!images.length) return null;

  const prev = () => setCurrent((c) => Math.max(0, c - 1));
  const next = () => setCurrent((c) => Math.min(images.length - 1, c + 1));

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-white/[0.07]">
      {/* 이미지 영역 */}
      <div className="relative bg-black/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[current].url}
          alt={images[current].caption || `카드 ${current + 1}`}
          className="w-full object-contain"
          style={{ maxHeight: 420 }}
        />

        {/* 캡션 오버레이 */}
        {images[current].caption && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 to-transparent px-4 pb-4 pt-8">
            <p className="text-sm leading-relaxed text-white">{images[current].caption}</p>
          </div>
        )}

        {/* 카운터 */}
        {images.length > 1 && (
          <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white/80">
            {current + 1} / {images.length}
          </div>
        )}

        {/* 화살표 */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              disabled={current === 0}
              className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-xl text-white transition-all hover:bg-black/80 disabled:opacity-20"
            >
              ‹
            </button>
            <button
              onClick={next}
              disabled={current === images.length - 1}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-xl text-white transition-all hover:bg-black/80 disabled:opacity-20"
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* 점 인디케이터 */}
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 bg-black/30 py-2.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all ${
                i === current ? "h-1.5 w-5 bg-white" : "h-1.5 w-1.5 bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
