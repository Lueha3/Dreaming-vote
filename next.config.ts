import type { NextConfig } from "next";

// 우리 앱이 실제로 의존하는 외부 출처만 화이트리스트한다.
// - 폰트(Pretendard CSS+woff2): cdn.jsdelivr.net
// - 인증/DB/스토리지/Realtime: Supabase (*.supabase.co + wss)
// 주의: 빌드 env(NEXT_PUBLIC_SUPABASE_URL)에 의존하면 일부 빌드 환경에서 값이 비어
// connect-src에서 Supabase가 누락→로그인/세션이 CSP에 차단된다. 와일드카드로 하드코딩한다.
const FONT_CDN = "https://cdn.jsdelivr.net";
const connectSrc = [
  "'self'",
  "https://*.supabase.co",
  "wss://*.supabase.co",
  FONT_CDN,
].join(" ");

// 주의: script-src의 'unsafe-inline'/'unsafe-eval'은 Next 하이드레이션 인라인 스크립트,
// layout.tsx 폰트 swap 스크립트, browser-image-compression(eval) 때문에 현재 필요하다.
// nonce 기반 강화는 후속(P1) 과제. upgrade-insecure-requests는 로컬(http) dev를 깨므로 제외.
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${FONT_CDN}`,
  `style-src 'self' 'unsafe-inline' ${FONT_CDN}`,
  `font-src 'self' ${FONT_CDN} data:`,
  `img-src 'self' blob: data: https:`,
  `connect-src ${connectSrc}`,
  `worker-src 'self' blob:`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // CSP frame-ancestors가 주 방어선. X-Frame-Options는 레거시 브라우저용으로 일치(DENY)시킴.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
    // CORS 헤더(Access-Control-Allow-*)는 의도적으로 두지 않는다.
    // 앱은 동일 출처에서 자기 API만 호출하므로 교차 출처 허용이 불필요하고,
    // 와일드카드(*)는 공격면만 넓힌다. 필요해지면 특정 출처를 명시 추가할 것.
  },
};

export default nextConfig;
