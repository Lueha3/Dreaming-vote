import { ImageResponse } from "next/og";
import { AppIconScene } from "@/lib/appIcon";

// iOS "홈 화면에 추가" 아이콘. 정사각형 풀블리드로 두고(둥근 모서리 없음) —
// iOS가 자체적으로 마스킹하므로 여기서 둥글리면 이중 라운딩이 생김.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<AppIconScene markPx={140} />, size);
}
