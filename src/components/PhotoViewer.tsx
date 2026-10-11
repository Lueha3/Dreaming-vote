"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
// 이 속도(px/ms) 이상으로 튕기면(플릭) 짧게 끌어도 넘기거나 닫는다.
const FLICK_VELOCITY = 0.5;
const EXIT_MS = 240;
const SLIDE_MS = 340;
const EASE_OUT = "cubic-bezier(.22,.8,.25,1)";
const CHROME_T = "opacity .2s ease, visibility .2s";

const clampIdx = (i: number, len: number) => (i >= 0 && i < len ? i : 0);

/**
 * 전체화면 사진 뷰어 — 썸네일/캐러셀을 누르면 곧바로 이 화면이 열린다(중간 카드 단계 없음).
 * - 사진은 가로로 이어진 트랙 위에 놓여, 좌우로 끌면 사진이 손가락을 따라 밀려오고
 *   놓으면 가장 가까운 사진으로 미끄러져 멈춘다(첫/마지막 사진 밖으로는 고무줄 저항).
 *   첫/마지막 사진에서 더 밀면 닫힌다.
 * - 위·아래로 끌면 사진이 손가락을 그대로(대각선까지) 따라오며 작아지고 배경·버튼이 옅어진다.
 *   기준 거리를 넘기거나 빠르게 튕기면 그 방향으로 날아가며 사라진 뒤 닫힌다(X 버튼과 같은 효과).
 * - 화면을 한 번 탭하면 닫기·화살표·번호·캡션이 사라지고, 다시 탭하면 나타난다.
 * - portal로 body에 붙여, 조상에 transform이 있어도 항상 뷰포트 전체를 덮는다.
 * touch-action:none으로 브라우저 기본 스크롤을 막아 제스처를 전부 이 컴포넌트가 처리한다.
 */
export function PhotoViewer({ images, initialIndex = 0, onClose, onIndexChange, renderActions }: Props) {
  const [index, setIndex] = useState(() => clampIdx(initialIndex, images.length));
  const [chromeOn, setChromeOn] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const imgRefs = useRef<(HTMLImageElement | null)[]>([]);
  const chromeRef = useRef<HTMLDivElement>(null);
  const chromeOnRef = useRef(true);
  const closing = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touch = useRef({
    x: 0,
    y: 0,
    axis: null as "x" | "y" | null,
    startX: 0, // 터치 시작 시점 트랙의 실제 위치(px) — 슬라이드 도중 다시 잡아도 튀지 않게
    lx: 0,
    ly: 0,
    lt: 0,
    vx: 0,
    vy: 0,
  });

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  if (images.length === 0) return null;
  const last = images.length - 1;

  const width = () => rootRef.current?.clientWidth ?? window.innerWidth;
  const curImg = () => imgRefs.current[index] ?? null;

  function setChrome(on: boolean) {
    chromeOnRef.current = on;
    setChromeOn(on);
  }

  // 트랙을 target 사진 위치로 미끄러뜨린다(index 상태도 함께 갱신).
  function slideTo(target: number) {
    const track = trackRef.current;
    if (track) {
      track.style.transition = `transform ${SLIDE_MS}ms ${EASE_OUT}`;
      track.style.transform = `translate3d(${-target * 100}%,0,0)`;
    }
    if (target !== index) {
      setIndex(target);
      onIndexChange?.(target);
    }
  }

  // 위·아래 드래그를 놓았지만 닫지 않을 때: 사진·배경·버튼을 원위치로 복귀.
  function resetVertical() {
    const img = curImg();
    if (img) {
      img.style.transition = `transform .3s ${EASE_OUT}`;
      img.style.transform = "";
    }
    if (rootRef.current) {
      rootRef.current.style.transition = `background-color .3s ${EASE_OUT}`;
      rootRef.current.style.backgroundColor = "";
    }
    if (chromeRef.current) {
      chromeRef.current.style.transition = CHROME_T;
      chromeRef.current.style.opacity = chromeOnRef.current ? "1" : "0";
    }
  }

  // 사진이 (dx,dy) 방향으로 날아가며 사라지고, 애니메이션이 끝나면 닫는다. 두 번 호출돼도 한 번만 처리.
  function animateClose(dx = 0, dy = 0) {
    if (closing.current) return;
    closing.current = true;
    const img = curImg();
    const root = rootRef.current;
    const chrome = chromeRef.current;
    const dist = Math.hypot(dx, dy);
    const throwX = dist > 1 ? (dx / dist) * window.innerWidth * 0.5 : 0;
    const throwY = dist > 1 ? (dy / dist) * window.innerHeight * 0.5 : 0;
    if (img) {
      img.style.transition = `transform ${EXIT_MS}ms ${EASE_OUT}, opacity ${EXIT_MS}ms ease-out`;
      img.style.transform = `translate3d(${dx + throwX}px, ${dy + throwY}px, 0) scale(${dist > 1 ? 0.7 : 0.92})`;
      img.style.opacity = "0";
    }
    if (root) {
      root.style.transition = `background-color ${EXIT_MS}ms ease-out`;
      root.style.backgroundColor = "rgba(0,0,0,0)";
    }
    if (chrome) {
      chrome.style.transition = `opacity ${Math.round(EXIT_MS * 0.6)}ms ease-out`;
      chrome.style.opacity = "0";
    }
    closeTimer.current = setTimeout(onClose, EXIT_MS);
  }

  function onTouchStart(e: React.TouchEvent) {
    if (closing.current) return;
    const p = e.touches[0];
    const track = trackRef.current;
    // 슬라이드 애니메이션 도중에 다시 잡으면, 그 순간의 위치에서 멈춰 손가락을 바로 따라가게 한다.
    let startX = -index * width();
    if (track) {
      const m = new DOMMatrixReadOnly(getComputedStyle(track).transform);
      startX = m.m41;
      track.style.transition = "none";
      track.style.transform = `translate3d(${startX}px,0,0)`;
    }
    touch.current = { x: p.clientX, y: p.clientY, axis: null, startX, lx: p.clientX, ly: p.clientY, lt: e.timeStamp, vx: 0, vy: 0 };
    const img = curImg();
    if (img) img.style.transition = "none";
    if (rootRef.current) rootRef.current.style.transition = "none";
    if (chromeRef.current) chromeRef.current.style.transition = "none";
  }

  function onTouchMove(e: React.TouchEvent) {
    if (closing.current) return;
    const t = touch.current;
    const p = e.touches[0];
    const dx = p.clientX - t.x;
    const dy = p.clientY - t.y;
    // 손가락이 조금 움직인 뒤에야 방향을 확정한다 — 그 전엔 탭으로 본다.
    if (!t.axis && Math.hypot(dx, dy) > 8) {
      t.axis = Math.abs(dy) > Math.abs(dx) ? "y" : "x";
    }
    // 순간 속도(px/ms) — 직전 샘플과 섞어 튀는 값을 누그러뜨린다.
    const dt = e.timeStamp - t.lt;
    if (dt > 0) {
      t.vx = 0.6 * ((p.clientX - t.lx) / dt) + 0.4 * t.vx;
      t.vy = 0.6 * ((p.clientY - t.ly) / dt) + 0.4 * t.vy;
      t.lx = p.clientX;
      t.ly = p.clientY;
      t.lt = e.timeStamp;
    }
    if (!t.axis) return;
    if (t.axis === "y") {
      // 사진이 손가락을 그대로(좌우 흔들림 포함) 따라오고, 멀어질수록 작아지며 배경·버튼이 옅어진다.
      const img = curImg();
      if (!img) return;
      const k = Math.max(0, 1 - Math.abs(dy) / 420);
      img.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${Math.max(0.72, 1 - Math.abs(dy) / 1100)})`;
      if (rootRef.current) rootRef.current.style.backgroundColor = `rgba(0,0,0,${0.95 * k})`;
      if (chromeRef.current && chromeOnRef.current) {
        chromeRef.current.style.opacity = String(Math.max(0, 1 - Math.abs(dy) / 160));
      }
    } else if (trackRef.current) {
      // 사진이 손가락을 따라 밀려온다. 넘길 사진이 없는 쪽으로 밀 땐 고무줄처럼 저항을 준다.
      const track = trackRef.current;
      let disp = t.startX + dx + index * width(); // 현재 사진이 제자리일 때 대비 이동량
      if ((index === 0 && disp > 0) || (index === last && disp < 0)) disp *= 0.45;
      track.style.transform = `translate3d(${-index * width() + disp}px,0,0)`;
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (closing.current) return;
    const t = touch.current;
    const axis = t.axis;
    t.axis = null;
    if (chromeRef.current) chromeRef.current.style.transition = CHROME_T;
    if (!axis) {
      // 탭 — 트랙을 제자리로 맞춰 두고(슬라이드 도중 멈춘 경우), 뒤따르는 click이 컨트롤 토글을 처리
      if (trackRef.current) {
        slideTo(index);
      }
      return;
    }
    // 드래그였으면 뒤따르는 ghost click이 컨트롤 토글로 새지 않게 막는다.
    if (e.cancelable) e.preventDefault();

    const p = e.changedTouches[0];
    const dx = p.clientX - t.x;
    const dy = p.clientY - t.y;
    // 손가락을 멈췄다가 뗀 경우엔 마지막 샘플의 속도가 낡았으니 무시한다.
    const stale = e.timeStamp - t.lt > 100;
    const vx = stale ? 0 : t.vx;
    const vy = stale ? 0 : t.vy;

    if (axis === "y") {
      if (Math.abs(dy) > DISMISS_DIST || (Math.abs(vy) > FLICK_VELOCITY && Math.abs(dy) > 30 && Math.sign(vy) === Math.sign(dy))) {
        return animateClose(dx, dy);
      }
      return resetVertical();
    }

    let disp = t.startX + dx + index * width();
    const flick = Math.abs(vx) > FLICK_VELOCITY && Math.sign(vx) === Math.sign(disp) && Math.abs(disp) > 20;
    const dir = disp < 0 ? 1 : -1; // 왼쪽으로 밀면 다음 사진
    const target = index + dir;
    const hasTarget = target >= 0 && target <= last;
    if (hasTarget) return slideTo(Math.abs(disp) > SWIPE_NAV || flick ? target : index);
    disp *= 0.45; // 화면에 보인 만큼(고무줄 적용 후)으로 판단
    if (Math.abs(disp) > DISMISS_DIST * 0.6 || (flick && Math.abs(disp) > 18)) return animateClose(disp, 0);
    slideTo(index);
  }

  const safeTop = "max(0.75rem, env(safe-area-inset-top))";
  const current = images[index] ?? images[0];

  return createPortal(
    <div
      ref={rootRef}
      className="photo-viewer-in fixed inset-0 z-[80] overflow-hidden bg-black/95"
      style={{ touchAction: "none" }}
      onClick={() => setChrome(!chromeOnRef.current)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* 사진 트랙 — 모든 사진이 가로로 나란히 놓이고, 보이는 사진 + 양옆 한 장씩만 실제로 불러온다. */}
      <div ref={trackRef} className="absolute inset-0 will-change-transform" style={{ transform: `translate3d(${-index * 100}%,0,0)` }}>
        {images.map((img, i) => (
          <div key={i} className="absolute inset-y-0 flex w-full items-center justify-center" style={{ left: `${i * 100}%` }}>
            {Math.abs(i - index) <= 1 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={(el) => {
                  imgRefs.current[i] = el;
                }}
                src={img.url}
                alt={img.caption || `사진 ${i + 1}`}
                draggable={false}
                className="max-h-full max-w-full select-none object-contain"
              />
            )}
          </div>
        ))}
      </div>

      <div
        ref={chromeRef}
        className="pointer-events-none absolute inset-0"
        style={{ opacity: chromeOn ? 1 : 0, visibility: chromeOn ? "visible" : "hidden", transition: CHROME_T }}
      >
        {current.caption && (
          <p
            className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-5 pb-6 pt-12 text-center text-sm font-medium leading-relaxed text-white"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
          >
            {current.caption}
          </p>
        )}

        <div className="pointer-events-auto absolute left-3" style={{ top: safeTop }} onClick={(e) => e.stopPropagation()}>
          {renderActions?.(index)}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            animateClose();
          }}
          aria-label="닫기"
          className="pointer-events-auto absolute right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl text-white transition-colors hover:bg-white/25"
          style={{ top: safeTop }}
        >
          ✕
        </button>

        {images.length > 1 && (
          <>
            <div
              className="absolute left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white"
              style={{ top: safeTop }}
            >
              {index + 1} / {images.length}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                slideTo(index - 1);
              }}
              disabled={index === 0}
              aria-label="이전 사진"
              className="pointer-events-auto absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-xl text-white transition-colors hover:bg-white/25 disabled:opacity-30"
            >
              ‹
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                slideTo(index + 1);
              }}
              disabled={index === last}
              aria-label="다음 사진"
              className="pointer-events-auto absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-xl text-white transition-colors hover:bg-white/25 disabled:opacity-30"
            >
              ›
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
