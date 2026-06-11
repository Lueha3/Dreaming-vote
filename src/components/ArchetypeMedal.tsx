import { ARCHETYPE_ART, ARCHETYPE_ART_DEFAULT } from "./archetypeArt";

/**
 * 라인업 보드용 그라데이션 정의 — 보드 안에 1회만 렌더하고
 * 모든 메달이 url(#lineupDisc)/url(#lineupRing)로 참조한다.
 */
export function LineupDefs() {
  return (
    <svg width="0" height="0" aria-hidden style={{ position: "absolute" }}>
      <defs>
        <radialGradient id="lineupDisc" cx="50%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor="#E6F2FB" />
          <stop offset="100%" stopColor="#C7E0F3" />
        </radialGradient>
        <linearGradient id="lineupRing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F0B429" />
          <stop offset="100%" stopColor="#35C3B4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * 성경 인물형 메달. label이 19종 중 하나면 해당 라인아트, 아니면(없으면) 사람 실루엣.
 * 디스크(하늘빛) + 골드→민트 링 + 골드 스파클로 브랜드를 입힌다.
 */
export function ArchetypeMedal({
  label,
  size = 60,
}: {
  label?: string | null;
  size?: number;
}) {
  const art = (label && ARCHETYPE_ART[label]) || ARCHETYPE_ART_DEFAULT;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <circle
        cx="32"
        cy="32"
        r="29"
        fill="url(#lineupDisc)"
        stroke="url(#lineupRing)"
        strokeWidth="2.4"
      />
      <g
        stroke="#3A4149"
        strokeWidth="2.1"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {art}
      </g>
      <path
        d="M48 16c.4 2 1.2 2.8 3.2 3.2-2 .4-2.8 1.2-3.2 3.2-.4-2-1.2-2.8-3.2-3.2 2-.4 2.8-1.2 3.2-3.2z"
        fill="#F0B429"
      />
    </svg>
  );
}
