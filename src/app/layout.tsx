import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

import { Header } from "@/components/Header";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BlueHumanity — AI 대화로 찾는 나의 비즈니스 페르소나",
  description:
    "AI와의 솔직한 대화 기록으로 나만의 협업 페르소나를 발견하고, 진짜 맞는 팀을 만나세요.",
  openGraph: {
    title: "BlueHumanity",
    description: "AI 대화로 찾는 나의 비즈니스 페르소나",
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
