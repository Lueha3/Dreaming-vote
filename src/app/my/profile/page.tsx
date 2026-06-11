"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { NICKNAME_RE } from "@/lib/membership";

/**
 * 프로필 수정 — 프로필 사진 전용.
 * 닉네임(집단-나이-이름)은 청년부 가입 신청서의 이름·나이로 자동 설정되며
 * 여기서 직접 수정할 수 없다 (가입 신청 폼에 종속).
 */
export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // 현재 값
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [membershipStatus, setMembershipStatus] = useState<string>("none");

  // 폼 상태
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setNotLoggedIn(true);
        setLoading(false);
        return;
      }
      setUserId(user.id);
      const avatar = user.user_metadata?.avatar_url ?? null;
      setCurrentAvatar(avatar);
      setAvatarPreview(avatar);

      // 닉네임·멤버십 상태는 서버(Prisma)가 진실 — 승인 시 자동 생성된 값
      try {
        const res = await fetch("/api/membership", { cache: "no-store" });
        const json = await res.json();
        if (json?.ok) {
          // 구글 이름 폴백이 '활동 닉네임'으로 보이지 않게 형식 통과한 값만 표시
          const raw = json.membership.nickname ?? null;
          setNickname(raw && NICKNAME_RE.test(raw) ? raw : null);
          setMembershipStatus(json.membership.membershipStatus ?? "none");
        }
      } catch {
        /* 조회 실패 시 닉네임 카드만 비워진다 */
      }
      setLoading(false);
    });
  }, []);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("사진은 2MB 이하만 업로드 가능합니다."); return; }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError(null);
  }

  async function uploadAvatar(): Promise<string | null> {
    if (!avatarFile || !userId) return null;
    const supabase = createClient();
    const ext = avatarFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${userId}.${ext}`;
    const { data, error } = await supabase.storage
      .from("avatars")
      .upload(path, avatarFile, { upsert: true, cacheControl: "3600" });
    if (error || !data) return null;
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(data.path);
    return publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!avatarFile) return;
    setError(null);
    setSaving(true);

    const newAvatarUrl = await uploadAvatar();
    if (!newAvatarUrl) {
      setError("사진 업로드에 실패했습니다. 다시 시도해주세요.");
      setSaving(false);
      return;
    }

    // Supabase 메타데이터 + Prisma 양쪽 동기화
    const supabase = createClient();
    const { error: supaErr } = await supabase.auth.updateUser({
      data: { avatar_url: newAvatarUrl },
    });
    if (supaErr) { setError("저장에 실패했습니다."); setSaving(false); return; }

    await fetch("/api/my/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarUrl: newAvatarUrl }),
    });

    setSuccess(true);
    setSaving(false);
    setTimeout(() => router.push("/my"), 1500);
  }

  const displayAvatar = avatarPreview ?? currentAvatar;

  if (loading) return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal/30 border-t-teal" />
    </div>
  );

  if (notLoggedIn) return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 text-center">
      <div>
        <p className="mb-4 text-sm text-ink-soft">로그인이 필요합니다.</p>
        <Link href="/login?next=/my/profile"
          className="btn-gold rounded-full px-6 py-2.5 text-sm font-semibold btn-glow">
          로그인하기
        </Link>
      </div>
    </div>
  );

  if (success) return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center text-center">
      <div>
        <div className="mb-4 text-4xl">✅</div>
        <p className="text-lg font-bold text-ink">저장됐습니다!</p>
        <p className="mt-2 text-sm text-ink-soft">잠시 후 이동합니다...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <div className="mx-auto max-w-sm px-4 py-12">
        <Link href="/my" className="mb-6 inline-block text-xs text-ink-soft hover:text-ink">
          ← 내 정보
        </Link>
        <h1 className="mb-8 text-xl font-bold text-ink">프로필 수정</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 프로필 사진 */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative h-24 w-24 overflow-hidden rounded-full border-2 border-white/90 transition-all hover:border-teal/60"
            >
              {displayAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayAvatar} alt="프로필" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-skyx/25 text-3xl">👤</div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100">
                <span className="text-xs font-semibold text-ink">변경</span>
              </div>
            </button>
            <p className="text-xs text-ink-faint">클릭해서 사진 변경 · JPG·PNG·WebP · 최대 2MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* 활동 닉네임 — 읽기 전용 (가입 신청 폼에 종속) */}
          <div className="glass-card p-5">
            <p className="mb-2 text-xs font-semibold text-ink">
              활동 닉네임 <span className="text-ink-faint font-normal">(집단-나이-이름)</span>
            </p>
            <p className={`text-lg font-bold ${nickname ? "text-ink" : "text-ink-faint"}`}>
              {nickname ?? "가입 승인 후 자동 설정돼요"}
            </p>
            <p className="mt-2.5 border-t border-sky-line pt-2.5 text-xs leading-relaxed text-ink-soft">
              닉네임은 청년부 가입 신청서의 이름·나이로 자동 설정되고, 변경이 까다로워요.
              {nickname
                ? " 수정이 필요하면 관리자에게 문의해주세요."
                : " 신청서를 작성할 때 이름과 나이를 정확히 입력해주세요!"}
            </p>
            {membershipStatus !== "approved" && (
              <Link
                href="/join"
                className="mt-3 inline-block text-xs font-semibold text-gold-ink underline underline-offset-2"
              >
                {membershipStatus === "pending" ? "가입 신청 현황 보기 →" : "청년부 가입 신청하기 →"}
              </Link>
            )}
          </div>

          {error && (
            <p className="rounded-xl border border-red-300/60 bg-red-500/[0.08] px-4 py-3 text-xs text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={!avatarFile || saving}
            className="btn-gold w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-40 btn-glow"
          >
            {saving ? "저장 중..." : "사진 저장하기"}
          </button>
        </form>
      </div>
    </div>
  );
}
