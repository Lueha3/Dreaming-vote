import { type SVGProps } from "react";

/**
 * 앱 공용 아이콘 시스템 — 하단 탭 5종(기본/선택) + 동아리 카테고리 8종.
 * 전 글리프 24×24 viewBox · 1.8px 라운드 스트로크 단일 규격.
 * SF Symbols 문법 베이스 + 렌더링 검증(Chromium)으로 소형 가독성 확인.
 * 색은 currentColor 상속 — 부모의 text-* 색을 그대로 따른다.
 */

const BASE = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} satisfies SVGProps<SVGSVGElement>;

const TAB_GLYPHS = {
  home: {
    outline: "<path d=\"M4.3 11.4 12 4.6l7.7 6.8V19a1.4 1.4 0 0 1-1.4 1.4h-4.1V17a2.2 2.2 0 0 0-4.4 0v3.4H5.7A1.4 1.4 0 0 1 4.3 19Z\"/>",
    solid: "<path d=\"M4.3 11.4 12 4.6l7.7 6.8V19a1.4 1.4 0 0 1-1.4 1.4h-4.1V17a2.2 2.2 0 0 0-4.4 0v3.4H5.7A1.4 1.4 0 0 1 4.3 19Z\" fill=\"currentColor\"/>",
  },
  plaza: {
    outline: "<path d=\"M12 4.3c4.8 0 8.6 3.1 8.6 7s-3.8 7-8.6 7c-.8 0-1.6-.1-2.4-.3-1.2.9-2.9 1.6-5.1 1.7.9-.9 1.5-2 1.7-3.1-1.8-1.3-2.8-3.2-2.8-5.3 0-3.9 3.8-7 8.6-7Z\"/>",
    solid: "<path d=\"M12 4.3c4.8 0 8.6 3.1 8.6 7s-3.8 7-8.6 7c-.8 0-1.6-.1-2.4-.3-1.2.9-2.9 1.6-5.1 1.7.9-.9 1.5-2 1.7-3.1-1.8-1.3-2.8-3.2-2.8-5.3 0-3.9 3.8-7 8.6-7Z\" fill=\"currentColor\"/>",
  },
  clubs: {
    outline: "<rect x=\"4\" y=\"4\" width=\"6.7\" height=\"6.7\" rx=\"1.5\"/><rect x=\"13.3\" y=\"4\" width=\"6.7\" height=\"6.7\" rx=\"1.5\"/><rect x=\"4\" y=\"13.3\" width=\"6.7\" height=\"6.7\" rx=\"1.5\"/><circle cx=\"16.65\" cy=\"16.65\" r=\"2.95\"/>",
    solid: "<rect x=\"4\" y=\"4\" width=\"6.7\" height=\"6.7\" rx=\"1.5\" fill=\"currentColor\"/><rect x=\"13.3\" y=\"4\" width=\"6.7\" height=\"6.7\" rx=\"1.5\" fill=\"currentColor\"/><rect x=\"4\" y=\"13.3\" width=\"6.7\" height=\"6.7\" rx=\"1.5\" fill=\"currentColor\"/><circle cx=\"16.65\" cy=\"16.65\" r=\"2.95\" fill=\"currentColor\"/>",
  },
  members: {
    outline: "<circle cx=\"9\" cy=\"7.6\" r=\"3.1\"/><path d=\"M2.8 19.2c.5-3.4 3-5.5 6.2-5.5s5.7 2.1 6.2 5.5\"/><circle cx=\"17.1\" cy=\"8.3\" r=\"2.4\"/><path d=\"M17.9 13.9c2.1.6 3.5 2.4 3.8 5\"/>",
    solid: "<circle cx=\"9\" cy=\"7.6\" r=\"3.1\" fill=\"currentColor\"/><path d=\"M9 13.7c-3.2 0-5.7 2.1-6.2 5.5-.1.6.4 1.2 1 1.2h10.4c.6 0 1.1-.6 1-1.2-.5-3.4-3-5.5-6.2-5.5Z\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"17.1\" cy=\"8.3\" r=\"2.4\" fill=\"currentColor\"/><path d=\"M17.3 13.7c2.6.3 4.4 2.3 4.7 5.1.1.6-.4 1.1-1 1.1h-3.5c.1-.4.2-.9.1-1.4-.2-1.8-1-3.4-2.2-4.6.6-.2 1.2-.2 1.9-.2Z\" fill=\"currentColor\" stroke=\"none\"/>",
  },
  my: {
    outline: "<circle cx=\"12\" cy=\"12\" r=\"8.6\"/><circle cx=\"12\" cy=\"9.7\" r=\"3\"/><path d=\"M5.9 18c1.2-2.7 3.4-4.2 6.1-4.2s4.9 1.5 6.1 4.2\"/>",
    solid: "<circle cx=\"12\" cy=\"12\" r=\"8.6\"/><circle cx=\"12\" cy=\"9.7\" r=\"3\" fill=\"currentColor\"/><path d=\"M12 13.9c-2.6 0-4.8 1.4-6 3.9 1.6 1.8 3.7 2.8 6 2.8s4.4-1 6-2.8c-1.2-2.5-3.4-3.9-6-3.9Z\" fill=\"currentColor\" stroke=\"none\"/>",
  },
} as const;

export type TabIconKey = keyof typeof TAB_GLYPHS;

/** 하단 탭 아이콘. active=true면 같은 실루엣의 솔리드 변형으로 전환. */
export function TabIcon({
  name,
  active = false,
  ...props
}: SVGProps<SVGSVGElement> & { name: TabIconKey; active?: boolean }) {
  const glyph = TAB_GLYPHS[name];
  return (
    <svg
      {...BASE}
      {...props}
      dangerouslySetInnerHTML={{ __html: active ? glyph.solid : glyph.outline }}
    />
  );
}

const CLUB_CATEGORY_GLYPHS: Record<string, string> = {
  "신앙": "<path d=\"M12 3.8v16.4\"/><path d=\"M6.9 9.3h10.2\"/>",
  "스터디": "<path d=\"M12 6.3C10.1 4.8 7.6 4.3 4.5 4.5c-.5 0-.9.4-.9 1v11.9c0 .6.4 1 1 1 2.8-.1 5.3.4 7.4 1.7 2.1-1.3 4.6-1.8 7.4-1.7.6 0 1-.4 1-1V5.5c0-.6-.4-1-.9-1-3.1-.2-5.6.3-7.5 1.8Z\"/><path d=\"M12 6.3v13.8\"/>",
  "취미/여가": "<path d=\"M7.3 6.8h9.4c2.9 0 4.9 2.3 5.1 5.4.2 2.9-.7 5.2-2.3 5.2-1.2 0-1.9-.9-2.5-2-.5-.9-1.1-1.4-2.2-1.4H9.2c-1.1 0-1.7.5-2.2 1.4-.6 1.1-1.3 2-2.5 2-1.6 0-2.5-2.3-2.3-5.2.2-3.1 2.2-5.4 5.1-5.4Z\"/><path d=\"M8.3 9.9v3.2\"/><path d=\"M6.7 11.5h3.2\"/><circle cx=\"15.3\" cy=\"12.7\" r=\"1.05\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"17.9\" cy=\"10.3\" r=\"1.05\" fill=\"currentColor\" stroke=\"none\"/>",
  "운동": "<circle cx=\"12\" cy=\"12\" r=\"8.4\"/><path d=\"M12 3.6v16.8\"/><path d=\"M6.1 6.3c1.7 1.6 2.6 3.5 2.6 5.7s-.9 4.1-2.6 5.7\"/><path d=\"M17.9 6.3c-1.7 1.6-2.6 3.5-2.6 5.7s.9 4.1 2.6 5.7\"/>",
  "봉사": "<path d=\"M17.8 10.6c.9-.85 1.9-2 1.9-3.4A3.4 3.4 0 0 0 15.3 4a3.45 3.45 0 0 0-6.2 2.2c0 1.5 1 2.5 1.9 3.4l3.4 3.2Z\"/><path d=\"M4 15.2h8.6a2 2 0 0 1 2 2c0 1.1-.9 2-2 2H8.2c-.7 0-1.4.2-2 .7L4 21.4\"/>",
  "창업/사이드프로젝트": "<path d=\"M12 3.4a5.7 5.7 0 0 1 5.7 5.7c0 1.9-.9 3.2-1.9 4.3-.7.8-1.2 1.6-1.4 2.6H9.6c-.2-1-.7-1.8-1.4-2.6-1-1.1-1.9-2.4-1.9-4.3A5.7 5.7 0 0 1 12 3.4Z\"/><path d=\"M9.9 18.4h4.2\"/><path d=\"M10.8 20.6h2.4\"/>",
  "문화/예술": "<path d=\"M12 3.6c4.9 0 8.6 3.4 8.6 7.6 0 2.6-1.7 4.2-4.1 4.2h-1.9c-1 0-1.8.7-1.8 1.7 0 .4.2.75.4 1.1.2.35.3.7.3 1.1 0 .9-.75 1.5-1.7 1.5-4.6-.1-8.3-3.9-8.3-8.6C3.5 7.4 7.3 3.6 12 3.6Z\"/><circle cx=\"7.6\" cy=\"9.3\" r=\"1.1\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"11.4\" cy=\"6.9\" r=\"1.1\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"15.8\" cy=\"8.6\" r=\"1.1\" fill=\"currentColor\" stroke=\"none\"/>",
  "친목": "<circle cx=\"12\" cy=\"6.7\" r=\"2.6\"/><path d=\"M7.3 18.9c.5-2.9 2.3-4.7 4.7-4.7s4.2 1.8 4.7 4.7\"/><circle cx=\"5.4\" cy=\"8.6\" r=\"2.1\"/><path d=\"M2.4 17.5c.3-2.1 1.6-3.5 3.3-3.8\"/><circle cx=\"18.6\" cy=\"8.6\" r=\"2.1\"/><path d=\"M21.6 17.5c-.3-2.1-1.6-3.5-3.3-3.8\"/>",
};

/** 카테고리별 기본 아이콘 색(앱 *-ink 토큰). tone="inherit"로 끌 수 있음. */
export const CLUB_CATEGORY_ICON_TONE: Record<string, string> = {
  "신앙": "text-skyx-ink",
  "스터디": "text-skyx-ink",
  "취미/여가": "text-gold-ink",
  "운동": "text-teal-ink",
  "봉사": "text-gold-ink",
  "창업/사이드프로젝트": "text-skyx-ink",
  "문화/예술": "text-skyx-ink",
  "친목": "text-teal-ink",
};

const FALLBACK_GLYPH = "<path d=\"M12 3l2.2 5.2L20 9.4l-4 4 1 5.6L12 16.4 7 19l1-5.6-4-4 5.8-1.2z\"/>";

/**
 * 동아리 카테고리 기본 아이콘. 사진 미등록 동아리의 커버·인라인 마커 공용.
 * 크기는 className(h-, w- 유틸)으로 지정. tone="category"(기본)면 카테고리 색,
 * tone="inherit"면 부모 텍스트 색을 따른다.
 */
export function ClubCategoryIcon({
  category,
  tone = "category",
  className,
  ...props
}: SVGProps<SVGSVGElement> & {
  category: string;
  tone?: "category" | "inherit";
}) {
  const markup = CLUB_CATEGORY_GLYPHS[category] ?? FALLBACK_GLYPH;
  const color = tone === "category" ? CLUB_CATEGORY_ICON_TONE[category] ?? "text-ink-soft" : undefined;
  const cls = [color, className].filter(Boolean).join(" ");
  return (
    <svg
      {...BASE}
      {...props}
      className={cls || undefined}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

