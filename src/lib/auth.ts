import { createClient } from "./supabase/server";
import { prisma } from "./db";

export type AuthUser = {
  supabaseId: string;
  dbUserId: string;
  nickname: string | null;
  avatarUrl: string | null;
};

/**
 * 서버 컴포넌트 / API Route에서 현재 로그인 유저 반환
 * - 카카오 첫 로그인 시 Prisma User 자동 생성 (upsert)
 * - 비로그인이면 null 반환 (에러가 아님 — 익명 허용 흐름)
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return null;

    const fallbackNickname =
      user.user_metadata?.full_name ??
      user.email?.split("@")[0] ??
      null;

    const dbUser = await prisma.user.upsert({
      where: { supabaseId: user.id },
      update: {},
      create: {
        supabaseId: user.id,
        nickname: fallbackNickname,
        avatarUrl: user.user_metadata?.avatar_url ?? null,
      },
      select: { id: true, nickname: true, avatarUrl: true, supabaseId: true },
    });

    return {
      supabaseId: user.id,
      dbUserId: dbUser.id,
      nickname: dbUser.nickname,
      avatarUrl: dbUser.avatarUrl,
    };
  } catch {
    return null;
  }
}

/**
 * 카카오 로그인 URL 생성 (클라이언트 컴포넌트에서 직접 호출)
 * redirectTo: 로그인 후 돌아올 경로
 */
export function getKakaoLoginUrl(redirectTo: string = "/"): string {
  const params = new URLSearchParams({
    provider: "kakao",
    redirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/callback?next=${encodeURIComponent(redirectTo)}`,
  });
  return `/api/auth/login?${params.toString()}`;
}
