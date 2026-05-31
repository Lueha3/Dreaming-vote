import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * 카카오 OAuth 로그인 시작
 * GET /api/auth/login?next=/report/[slug]
 * → Supabase OAuth URL로 리다이렉트
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get("next") ?? "/";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: {
      redirectTo: `${origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
      scopes: "profile_nickname profile_image",
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(`${origin}/?auth_error=1`);
  }

  return NextResponse.redirect(data.url);
}
