import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

import { Header } from "@/components/Header";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BlueHumanity — 꿈꾸는교회 청년부",
  description:
    "MBTI를 안다면 1분이면 충분해요. 내 성향에 맞는 동아리를 AI가 추천해드려요.",
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
    <html lang="ko" className="dark">
      <body className={`${geist.variable} antialiased bg-[#09090b]`}>
        <Header />
        {children}
      </body>
    </html>
  );
}
