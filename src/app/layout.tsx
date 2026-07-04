import type { Metadata, Viewport } from "next";
import "./globals.css";

import { Header } from "@/components/Header";
import { SkyBackdrop } from "@/components/SkyBackdrop";
import { AutoPushPrompt } from "@/components/AutoPushPrompt";

export const metadata: Metadata = {
  title: "BlueHumanity — 꿈꾸는교회 청년부",
  description:
    "성격유형을 안다면 1분이면 충분해요. 내 성향에 맞는 동아리를 찾아드려요.",
  openGraph: {
    title: "BlueHumanity — 꿈꾸는교회 청년부",
    description: "내 성향에 맞는 동아리 찾기 · 꿈꾸는교회 청년부",
    siteName: "BlueHumanity",
  },
  // iOS "홈 화면에 추가" 시 아이콘 아래 표시되는 이름 — 미설정 시 <title>이 길게 잘려 노출됨.
  appleWebApp: {
    capable: true,
    title: "꿈꾸는동아리",
    statusBarStyle: "default",
  },
};

// 하단 고정 CTA가 iOS 홈 인디케이터 영역까지 safe-area 인셋을 확보하려면 필요.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#7FBDE4",
};

const SUPABASE_ORIGIN = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
      : null;
  } catch {
    return null;
  }
})();

const FONT_CSS =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        {/* 폰트 CDN 커넥션을 첫 페인트 이전에 미리 연다 (핸드셰이크를 크리티컬 패스에서 제거).
            crossOrigin 필수 — 폰트 CSS는 익명 CORS 요청이라 없으면 커넥션이 재사용되지 않음. */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        {/* 클라이언트 인증(로그인/세션) 호출 대상 Supabase origin도 미리 연결 */}
        {SUPABASE_ORIGIN && (
          <>
            <link rel="preconnect" href={SUPABASE_ORIGIN} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={SUPABASE_ORIGIN} />
          </>
        )}
        {/* 폰트 CSS를 첫 페인트 비차단으로 로드: print 미디어로 받아 렌더를 막지 않고,
            로드 완료 후 인라인 스크립트로 all 승격(시스템 폰트 → Pretendard swap).
            preload로 페치를 일찍 시작하고, 무JS 환경은 noscript 폴백으로 보장. */}
        <link rel="preload" as="style" href={FONT_CSS} crossOrigin="anonymous" />
        <link
          id="pretendard-css"
          rel="stylesheet"
          href={FONT_CSS}
          media="print"
          crossOrigin="anonymous"
          suppressHydrationWarning
        />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){var l=document.getElementById('pretendard-css');if(!l)return;if(l.sheet){l.media='all';}else{l.addEventListener('load',function(){l.media='all';});}})();",
          }}
        />
        <noscript>
          {/* eslint-disable-next-line @next/next/no-css-tags */}
          <link rel="stylesheet" href={FONT_CSS} crossOrigin="anonymous" />
        </noscript>
      </head>
      <body className="antialiased">
        <SkyBackdrop />
        <Header />
        {children}
        <AutoPushPrompt />
      </body>
    </html>
  );
}
