import type { Metadata } from "next";
import "./harmony.css";

export const metadata: Metadata = {
  title: "블루하모니 — 우리 집 기질 나침반",
  description:
    "부모 성향 × 아이 기질 5분 검사. 우리 집만의 조합 카드와 충돌 지도를 받아보세요.",
  openGraph: {
    title: "우리 집은 어떤 조합일까? — 블루하모니",
    description: "부모 성향 × 아이 기질 검사로 우리 집 조합 카드를 만들어 보세요.",
    siteName: "BlueHarmony",
  },
};

export default function HarmonyLayout({ children }: { children: React.ReactNode }) {
  // 전역 Header/BottomTabBar는 /harmony 경로에서 스스로 렌더를 생략한다 (각 컴포넌트 참조).
  return <div className="hy-stage">{children}</div>;
}
