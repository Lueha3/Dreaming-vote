// 앱 아이콘(홈 화면 추가용) 공통 마크 — 꿈꾸는교회 로고의 탑·십자가·별·틸 포인트를
// 작은 아이콘에서도 또렷하게 보이도록 굵은 단색 도형으로 단순화한 버전.
// icon.tsx(파비콘) / apple-icon.tsx(iOS 홈 화면) / manifest 아이콘 라우트가 함께 사용.
export function AppIconMark({ px }: { px: number }) {
  return (
    <svg width={px} height={px} viewBox="0 0 100 100" style={{ display: "block" }}>
      <polygon points="38,86 38,40 50,26 62,40 62,86" fill="#F0B429" />
      <rect x="57" y="68" width="16" height="18" rx="2" fill="#35C3B4" />
      <rect x="48.4" y="8" width="3.2" height="20" fill="#FFFFFF" />
      <rect x="42" y="16" width="16" height="3.2" fill="#FFFFFF" />
      <polygon
        points="66,10 67.47,13.98 71.71,14.15 68.38,16.77 69.53,20.85 66,18.5 62.47,20.85 63.62,16.77 60.29,14.15 64.53,13.98"
        fill="#FFFFFF"
      />
    </svg>
  );
}

// 사이트 배경과 동일한 하늘 그라데이션 — 홈 화면 아이콘 배경.
export const APP_ICON_BG = "linear-gradient(160deg, #BCDCF2 0%, #7FBDE4 50%, #4A90C2 100%)";

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
