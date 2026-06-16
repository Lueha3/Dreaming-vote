import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request });

  // 인증 쿠키가 전혀 없으면(비로그인·외부 첫 유입) 갱신할 세션도, 검증할 토큰도 없다.
  // 이 경우 getUser()는 어차피 null을 반환하므로 Supabase Auth 왕복을 생략해
  // 모든 공개 페이지의 TTFB에서 불필요한 네트워크 홉을 제거한다.
  const hasSessionCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-"));
  if (!hasSessionCookie) return supabaseResponse;

  return refreshSession(request);
}

async function refreshSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: CookieOptions }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: refresh token 갱신 — 이 호출 없으면 세션이 만료됨.
  // getUser()와 createServerClient() 사이에 로직을 넣지 말 것 (세션 동기화 깨짐).
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * 다음 경로를 제외한 모든 요청에서 실행:
     * - _next/static, _next/image : 정적 파일/이미지 최적화
     * - favicon.ico, 이미지 파일 (svg/png/jpg/...)
     * - api/og : OG 이미지 생성 (@vercel/og)
     * - api/auth : OAuth 콜백/로그인/로그아웃 — 자체적으로 세션 쿠키를 관리하므로
     *   토큰 갱신 미들웨어와 충돌하지 않도록 제외
     */
    "/((?!_next/static|_next/image|favicon.ico|api/og|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
