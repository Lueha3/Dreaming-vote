import { ImageResponse } from "next/og";
import { AppIconScene } from "@/lib/appIcon";

export async function GET() {
  return new ImageResponse(<AppIconScene markPx={150} />, {
    width: 192,
    height: 192,
  });
}
