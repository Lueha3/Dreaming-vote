import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Supabase OAuth 콜백 처리
 * 카카오 로그인 후 Supabase가 이 URL로 리다이렉트
 * code를 세션으로 교환한 뒤 next 파라미터 경로로 이동
 */
/**
 * next 파라미터 오픈 리다이렉트 방어 — 우리 사이트 내부 경로만 허용한다.
 * 단일 '/'로 시작하는 상대경로만 통과시켜 //evil.com, /\evil.com,
 * @evil.com, .evil.com, https://evil.com 같은 외부 이동을 모두 차단.
 */
function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/")) return "/";
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  return raw;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 에러 시 홈으로 (추후 에러 페이지로 교체 가능)
  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
