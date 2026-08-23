import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  LAST_ACTIVE_COOKIE,
  SESSION_TIMEOUT_CODE,
  SESSION_TIMEOUT_MESSAGE,
  evaluateSessionTimeout,
  timestampCookieOptions,
} from "@/lib/sessionTimeout";

export async function middleware(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request });

  // 인증 쿠키가 전혀 없으면(비로그인·외부 첫 유입) 갱신할 세션도, 검증할 토큰도 없다.
  // 이 경우 getUser()는 어차피 null을 반환하므로 Supabase Auth 왕복을 생략해
  // 모든 공개 페이지의 TTFB에서 불필요한 네트워크 홉을 제거한다.
  const hasSessionCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-"));
  if (!hasSessionCookie) return supabaseResponse;

  // 자동 로그아웃 집행 지점 — 세션을 갱신하기 '전에' 본다. 만료된 세션을 갱신부터 하면
  // Supabase 토큰이 새로 발급되어, 끊으려던 세션의 수명을 오히려 늘려주게 된다.
  const now = Date.now();
  const verdict = evaluateSessionTimeout({
    lastActive: request.cookies.get(LAST_ACTIVE_COOKIE)?.value,
    now,
  });

  if (verdict.status === "timeout" && !isTimeoutExempt(request.nextUrl.pathname)) {
    return timeoutResponse(request);
  }

  const response = await refreshSession(request);

  // 정책 시행 전부터 로그인해 있던 세션에는 타임스탬프가 없다. 이걸 만료로 보면 배포 순간
  // 전원이 튕기므로, 지금을 시작점으로 심고 통과시킨다(fail-open).
  if (verdict.status === "seed") {
    response.cookies.set(LAST_ACTIVE_COOKIE, String(now), timestampCookieOptions());
  }
  return response;
}

/**
 * 만료 처리에서 빼는 경로. /login으로 보내놓고 거기서 또 만료 판정을 하면 리다이렉트가
 * 맴돈다(응답에서 쿠키를 지우긴 하지만, 그 응답이 도달하기 전 경합을 만들 이유가 없다).
 */
function isTimeoutExempt(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/api/auth/");
}

/** 만료 응답 — 인증 쿠키를 전부 걷어내고 로그인 화면(또는 API면 401)으로 보낸다. */
function timeoutResponse(request: NextRequest) {
  const isApi = request.nextUrl.pathname.startsWith("/api/");

  let response: NextResponse;
  if (isApi) {
    response = NextResponse.json(
      { ok: false, code: SESSION_TIMEOUT_CODE, error: SESSION_TIMEOUT_MESSAGE },
      { status: 401 },
    );
  } else {
    const login = new URL("/login", request.url);
    login.searchParams.set("reason", "idle");
    // 재로그인 후 보던 화면으로 되돌려준다. 같은 요청의 내부 경로라 오픈 리다이렉트가 아니다.
    const back = request.nextUrl.pathname + request.nextUrl.search;
    if (back !== "/") login.searchParams.set("next", back);
    response = NextResponse.redirect(login);
  }

  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("sb-")) response.cookies.set(cookie.name, "", { path: "/", maxAge: 0 });
  }
  response.cookies.set(LAST_ACTIVE_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
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
  // createServerClient()와 이 호출 사이에 로직을 넣지 말 것 (세션 동기화 깨짐).
  //
  // getUser()는 매 요청 Supabase Auth로 네트워크 왕복(원격 JWT 검증)을 한다.
  // getClaims()는 내부적으로 getSession()을 호출해 만료 임박 토큰을 갱신(setAll로 쿠키 반영)하면서,
  // 비대칭 서명키 환경에선 JWT를 로컬 검증한다 — 갱신 동작은 유지하되 매 요청 네트워크 홉을 제거.
  // (대칭 HS256이면 내부적으로 getUser로 폴백하므로 동작 무회귀)
  await supabase.auth.getClaims();

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
