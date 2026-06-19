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

// script-src 정책:
// - 'unsafe-eval'은 dev HMR(React Refresh)에만 필요. 프로덕션 번들·browser-image-compression은
//   eval을 쓰지 않음(검증) → 프로덕션에서는 제외해 CSP를 강화한다.
// - 'unsafe-inline'은 유지한다. 제거하려면 nonce가 필요한데, 그러면 정적 페이지(/ /clubs /join 등)가
//   전부 per-request 동적 렌더로 바뀌어 성능 회귀가 크다. 또한 이 앱엔 저장형 XSS 벡터가 없다
//   (사용자 콘텐츠는 전부 React 자동 이스케이프, 유저 입력 dangerouslySetInnerHTML 없음). 의도적 보류.
// upgrade-insecure-requests는 로컬(http) dev를 깨므로 제외.
const isDev = process.env.NODE_ENV !== "production";
const scriptSrc = ["'self'", "'unsafe-inline'", isDev ? "'unsafe-eval'" : "", FONT_CDN]
  .filter(Boolean)
  .join(" ");
const csp = [
  `default-src 'self'`,
  `script-src ${scriptSrc}`,
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
