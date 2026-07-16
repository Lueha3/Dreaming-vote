// 앱 아이콘(홈 화면 추가용) 공통 마크 — 흰 바탕 위 시안→블루 그라데이션 교회 실루엣 +
// 골드 스파크. 토스·제미나이 계열의 맑고 단순한 원색 아이콘 문법을 따른다.
// icon.tsx(파비콘) / apple-icon.tsx(iOS 홈 화면) / manifest 아이콘 라우트가 함께 사용.
export function AppIconMark({ px }: { px: number }) {
  return (
    <svg width={px} height={px} viewBox="0 0 100 100" style={{ display: "block" }}>
      <defs>
        <linearGradient id="churchGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#38BDF8" />
          <stop offset="1" stopColor="#1A6EF4" />
        </linearGradient>
      </defs>
      {/* 십자가 */}
      <path
        d="M50 9 c1.7 0 3.1 1.4 3.1 3.1 v5 h5 c1.7 0 3.1 1.4 3.1 3.1 s-1.4 3.1-3.1 3.1 h-5 v6.7 h-6.2 v-6.7 h-5 c-1.7 0-3.1-1.4-3.1-3.1 s1.4-3.1 3.1-3.1 h5 v-5 c0-1.7 1.4-3.1 3.1-3.1 Z"
        fill="url(#churchGradient)"
      />
      {/* 교회 몸체(박공지붕) */}
      <path
        d="M50 30 L72 47 L72 84 C72 87.3 69.3 90 66 90 L34 90 C30.7 90 28 87.3 28 84 L28 47 Z"
        fill="url(#churchGradient)"
      />
      {/* 아치문 (흰색 컷아웃) */}
      <path
        d="M50 60 C55 60 58.5 63.8 58.5 69 L58.5 90 L41.5 90 L41.5 69 C41.5 63.8 45 60 50 60 Z"
        fill="#FFFFFF"
      />
      {/* 골드 스파크 */}
      <path
        d="M75 13 l2.2 6.1 6.1 2.2 -6.1 2.2 -2.2 6.1 -2.2 -6.1 -6.1 -2.2 6.1 -2.2 Z"
        fill="#FFC838"
      />
    </svg>
  );
}

// 흰 바탕 — 원색 심볼이 또렷하게 도드라지도록.
export const APP_ICON_BG = "#FFFFFF";

export function AppIconScene({ markPx }: { markPx: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: APP_ICON_BG,
      }}
    >
      <AppIconMark px={markPx} />
    </div>
  );
}
