import { ImageResponse } from "next/og";
import { AppIconScene } from "@/lib/appIcon";

export async function GET() {
  return new ImageResponse(<AppIconScene markPx={400} />, {
    width: 512,
    height: 512,
  });
}
