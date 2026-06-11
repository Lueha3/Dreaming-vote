import type { Metadata } from "next";
import "./globals.css";

import { Header } from "@/components/Header";
import { SkyBackdrop } from "@/components/SkyBackdrop";

export const metadata: Metadata = {
  title: "BlueHumanity — 꿈꾸는교회 청년부",
  description:
    "성격유형을 안다면 1분이면 충분해요. 내 성향에 맞는 동아리를 AI가 추천해드려요.",
  openGraph: {
    title: "BlueHumanity — 꿈꾸는교회 청년부",
    description: "내 성향에 맞는 동아리 찾기 · 꿈꾸는교회 청년부",
    siteName: "BlueHumanity",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="antialiased">
        <SkyBackdrop />
        <Header />
        {children}
      </body>
    </html>
  );
}
