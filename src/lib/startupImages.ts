// iOS 홈 화면 앱의 런치 이미지(apple-touch-startup-image) 규격 목록.
// 이게 없으면 앱을 켤 때 OS가 흰 화면을 띄운 채 몇 초를 기다린다(웹앱 콜드스타트가 느릴수록 길어짐).
// iOS는 미디어쿼리가 기기와 정확히 일치할 때만 런치 이미지를 쓰므로 기기별로 나열해야 한다.
//
// 이 목록이 단일 출처다 — layout.tsx가 <link> 태그를 만들고,
// /startup-image/[size] 라우트가 허용 크기 화이트리스트로 함께 쓴다.
// 세로(portrait)만 정의한다 — 이 앱은 모바일 세로 전용이다.

export type StartupImageSpec = {
  /** 실제 픽셀 크기(런치 이미지 해상도) */
  w: number;
  h: number;
  /** CSS 픽셀 크기 + 배율 — 미디어쿼리 매칭용 */
  cw: number;
  ch: number;
  dpr: number;
  /** 해당 규격을 쓰는 기기(주석용) */
  devices: string;
};

export const STARTUP_IMAGES: StartupImageSpec[] = [
  { w: 640, h: 1136, cw: 320, ch: 568, dpr: 2, devices: "SE 1세대" },
  { w: 750, h: 1334, cw: 375, ch: 667, dpr: 2, devices: "8 · SE 2/3세대" },
  { w: 1242, h: 2208, cw: 414, ch: 736, dpr: 3, devices: "8 Plus" },
  { w: 1125, h: 2436, cw: 375, ch: 812, dpr: 3, devices: "X · XS · 11 Pro · 12/13 mini" },
  { w: 828, h: 1792, cw: 414, ch: 896, dpr: 2, devices: "XR · 11" },
  { w: 1242, h: 2688, cw: 414, ch: 896, dpr: 3, devices: "XS Max · 11 Pro Max" },
  { w: 1170, h: 2532, cw: 390, ch: 844, dpr: 3, devices: "12 · 13 · 14" },
  { w: 1284, h: 2778, cw: 428, ch: 926, dpr: 3, devices: "12/13 Pro Max · 14 Plus" },
  { w: 1179, h: 2556, cw: 393, ch: 852, dpr: 3, devices: "14 Pro · 15 · 15 Pro · 16" },
  { w: 1290, h: 2796, cw: 430, ch: 932, dpr: 3, devices: "14 Pro Max · 15 Plus/Pro Max · 16 Plus" },
  { w: 1206, h: 2622, cw: 402, ch: 874, dpr: 3, devices: "16 Pro" },
  { w: 1320, h: 2868, cw: 440, ch: 956, dpr: 3, devices: "16 Pro Max" },
];

/** iOS가 기기를 특정하는 미디어쿼리 — 하나라도 어긋나면 런치 이미지를 무시한다. */
export function startupImageMedia(s: StartupImageSpec): string {
  return `(device-width: ${s.cw}px) and (device-height: ${s.ch}px) and (-webkit-device-pixel-ratio: ${s.dpr}) and (orientation: portrait)`;
}

export function startupImageUrl(s: StartupImageSpec): string {
  return `/startup-image/${s.w}x${s.h}`;
}

/** 라우트 화이트리스트 — 임의 크기 요청으로 거대한 이미지를 만들지 못하게 막는다. */
export function findStartupImage(size: string): StartupImageSpec | null {
  const m = /^(\d{3,4})x(\d{3,4})$/.exec(size);
  if (!m) return null;
  const w = Number(m[1]);
  const h = Number(m[2]);
  return STARTUP_IMAGES.find((s) => s.w === w && s.h === h) ?? null;
}
