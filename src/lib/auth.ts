import { NextResponse } from "next/server";
import { createClient } from "./supabase/server";
import { prisma } from "./db";

export type AuthUser = {
  supabaseId: string;
  dbUserId: string;
  nickname: string | null;
  avatarUrl: string | null;
  membershipStatus: string; // none | pending | approved | rejected
  age: number | null; // 가입신청서의 검증된 나이 — 집단(러비아/유디코) 판정의 유일한 근거
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
      select: {
        id: true,
        nickname: true,
        avatarUrl: true,
        supabaseId: true,
        membershipStatus: true,
        age: true,
      },
    });

    return {
      supabaseId: user.id,
      dbUserId: dbUser.id,
      nickname: dbUser.nickname,
      avatarUrl: dbUser.avatarUrl,
      membershipStatus: dbUser.membershipStatus,
      age: dbUser.age,
    };
  } catch {
    return null;
  }
}

/**
 * 공동체 활동(동아리 개설·가입신청, 기도 올리기 등 쓰기)은 관리자 승인 멤버만.
 * 미승인이면 403 응답을 반환 — 클라이언트는 code로 /join 안내.
 */
export function membershipGate(user: AuthUser): NextResponse | null {
  if (user.membershipStatus === "approved") return null;
  return NextResponse.json(
    {
      ok: false,
      code: "membership_required",
      membershipStatus: user.membershipStatus,
      error:
        user.membershipStatus === "pending"
          ? "가입 승인을 기다리는 중이에요. 승인되면 바로 참여할 수 있어요."
          : "꿈꾸는교회 청년부 멤버 확인 후 참여할 수 있어요. 가입 신청을 먼저 해주세요.",
    },
    { status: 403 },
  );
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
