import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Supabase OAuth 콜백 처리
 * 카카오 로그인 후 Supabase가 이 URL로 리다이렉트
 * code를 세션으로 교환한 뒤 next 파라미터 경로로 이동
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

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
