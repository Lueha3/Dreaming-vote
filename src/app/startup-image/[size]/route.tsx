import { ImageResponse } from "next/og";

import { AppIconMark } from "@/lib/appIcon";
import { findStartupImage } from "@/lib/startupImages";

/**
 * GET /startup-image/{width}x{height}
 * iOS 홈 화면 앱의 런치 이미지 — 앱을 켠 직후 OS가 흰 화면 대신 이걸 띄운다.
 *
 * 구성: 앱 배경과 같은 하늘 그라데이션 + 앱 아이콘과 같은 교회 마크.
 * 그래서 [아이콘 탭] → [같은 마크의 런치 화면] → [로고가 펼쳐지는 스플래시] → [앱]이
 * 배경색·마크가 끊기지 않고 이어진다.
 *
 * 크기는 startupImages.ts 화이트리스트만 허용(임의 크기로 거대한 이미지를 만드는 것 방지).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const spec = findStartupImage(size);
  if (!spec) return new Response("Not found", { status: 404 });

  // 마크는 화면 폭의 약 22% — 아이콘 탭에서 이어지는 느낌을 주되 과하지 않게.
  const markPx = Math.round(spec.w * 0.22);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // globals.css body / manifest background_color와 동일한 하늘 톤
          background: "linear-gradient(180deg, #E9F5FC 0%, #CCE4F6 58%, #BCDCF2 100%)",
        }}
      >
        <AppIconMark px={markPx} />
      </div>
    ),
    {
      width: spec.w,
      height: spec.h,
      headers: {
        // 내용이 결정적이라 오래 캐시해도 안전 — 런치 때마다 재생성하지 않는다.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}
