import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { NICKNAME_RE } from "@/lib/membership";
import { ProfileForm } from "./ProfileForm";

// getAuthUser가 쿠키를 읽으므로 동적.
export const dynamic = "force-dynamic";

/**
 * 프로필 수정 — 서버 컴포넌트.
 * 기존: 클라 getUser()(네트워크) → /api/membership 직렬 2왕복 → 서버 getAuthUser 1회로 대체.
 * 닉네임·아바타·멤버십을 SSR로 prefill, 폼 상호작용만 클라(ProfileForm).
 */
export default async function ProfilePage() {
  const user = await getAuthUser();

  if (!user) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 text-center">
        <div>
          <p className="mb-4 text-sm text-ink-soft">로그인이 필요합니다.</p>
          <Link
            href="/login?next=/my/profile"
            className="btn-gold btn-glow rounded-full px-6 py-2.5 text-sm font-semibold"
          >
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  // 구글 이름 폴백이 '활동 닉네임'으로 보이지 않게 형식(집단-나이-이름) 통과한 값만 표시.
  const formalNickname = user.nickname && NICKNAME_RE.test(user.nickname) ? user.nickname : null;

  return (
    <ProfileForm
      supabaseId={user.supabaseId}
      initialAvatar={user.avatarUrl}
      nickname={formalNickname}
      membershipStatus={user.membershipStatus}
    />
  );
}
