"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const NICKNAME_RE = /^(러비아|유디코)-\d{2}-.+$/;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

function getGroup(age: number): "러비아" | "유디코" | null {
  if (age >= 20 && age <= 26) return "러비아";
  if (age >= 27 && age <= 34) return "유디코";
  return null;
}

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // 현재 값
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);
  const [currentNickname, setCurrentNickname] = useState<string | null>(null);

  // 폼 상태
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [age, setAge] = useState("");
  const [name, setName] = useState("");

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const ageNum = parseInt(age, 10);
  const group = !isNaN(ageNum) ? getGroup(ageNum) : null;
  const preview = group && name.trim() ? `${group}-${ageNum}-${name.trim()}` : null;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setNotLoggedIn(true); setLoading(false); return; }
      setUserId(user.id);
      const nick = user.user_metadata?.full_name ?? null;
      const avatar = user.user_metadata?.avatar_url ?? null;
      setCurrentNickname(nick);
      setCurrentAvatar(avatar);
      setAvatarPreview(avatar);
      if (nick && NICKNAME_RE.test(nick)) {
        const parts = nick.split("-");
        setAge(parts[1] ?? "");
        setName(parts.slice(2).join("-") ?? "");
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
    setUploadingAvatar(true);
    const supabase = createClient();
    const ext = avatarFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${userId}.${ext}`;
    const { data, error } = await supabase.storage
      .from("avatars")
      .upload(path, avatarFile, { upsert: true, cacheControl: "3600" });
    setUploadingAvatar(false);
    if (error || !data) return null;
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(data.path);
    return publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!preview && !avatarFile) return;
    setError(null);
    setSaving(true);

    const supabase = createClient();

    // 1. 아바타 업로드 (변경된 경우)
    let newAvatarUrl: string | null = null;
    if (avatarFile) {
      newAvatarUrl = await uploadAvatar();
      if (!newAvatarUrl) {
        setError("사진 업로드에 실패했습니다. 다시 시도해주세요.");
        setSaving(false);
        return;
      }
    }

    // 2. Supabase 메타데이터 업데이트
    const metaUpdate: Record<string, string> = {};
    if (preview) metaUpdate.full_name = preview;
    if (newAvatarUrl) metaUpdate.avatar_url = newAvatarUrl;

    if (Object.keys(metaUpdate).length > 0) {
      const { error: supaErr } = await supabase.auth.updateUser({ data: metaUpdate });
      if (supaErr) { setError("저장에 실패했습니다."); setSaving(false); return; }
    }

    // 3. Prisma 업데이트
    const prismaBody: Record<string, string> = {};
    if (preview) prismaBody.nickname = preview;
    if (newAvatarUrl) prismaBody.avatarUrl = newAvatarUrl;

    if (Object.keys(prismaBody).length > 0) {
      await fetch("/api/my/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prismaBody),
      });
    }

    setSuccess(true);
    setSaving(false);
    setTimeout(() => router.push("/my"), 1500);
  }

  const displayAvatar = avatarPreview ?? currentAvatar;

  if (loading) return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500/30 border-t-violet-400" />
    </div>
  );

  if (notLoggedIn) return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 text-center">
      <div>
        <p className="mb-4 text-sm text-zinc-400">로그인이 필요합니다.</p>
        <Link href="/login?next=/my/profile"
          className="rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white btn-glow">
          로그인하기
        </Link>
      </div>
    </div>
  );

  if (success) return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center text-center">
      <div>
        <div className="mb-4 text-4xl">✅</div>
        <p className="text-lg font-bold text-white">저장됐습니다!</p>
        <p className="mt-2 text-sm text-zinc-500">잠시 후 이동합니다...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#0a0a0a] text-white">
      <div className="mx-auto max-w-sm px-4 py-12">
        <Link href="/my" className="mb-6 inline-block text-xs text-zinc-500 hover:text-zinc-300">
          ← 내 정보
        </Link>
        <h1 className="mb-8 text-xl font-bold text-white">프로필 수정</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 프로필 사진 */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative h-24 w-24 overflow-hidden rounded-full border-2 border-white/10 transition-all hover:border-violet-500/50"
            >
              {displayAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayAvatar} alt="프로필" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-violet-500/20 text-3xl">👤</div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="text-xs font-medium text-white">변경</span>
              </div>
            </button>
            <p className="text-xs text-zinc-500">클릭해서 사진 변경 · JPG·PNG·WebP · 최대 2MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* 닉네임 */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#111111] p-5 space-y-4">
            <p className="text-xs font-semibold text-zinc-300">닉네임 <span className="text-zinc-600 font-normal">(집단-나이-이름)</span></p>

            <div>
              <label className="mb-1.5 block text-xs text-zinc-500">나이 <span className="text-zinc-600">(20~34세)</span></label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                min={20} max={34}
                placeholder="예: 31"
                className="w-full rounded-xl border border-white/[0.07] bg-black/30 px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-violet-500/50 focus:outline-none"
              />
              {age && (
                <div className="mt-2">
                  {group ? (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                      group === "러비아" ? "bg-blue-500/15 text-blue-300 border border-blue-500/25" : "bg-violet-500/15 text-violet-300 border border-violet-500/25"
                    }`}>✓ {group} 소속</span>
                  ) : (
                    <span className="text-xs text-red-400">20~34세만 가입 가능합니다.</span>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-zinc-500">이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 이정현"
                maxLength={20}
                className="w-full rounded-xl border border-white/[0.07] bg-black/30 px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-violet-500/50 focus:outline-none"
              />
            </div>
          </div>

          {/* 미리보기 */}
          <div className={`rounded-xl border px-4 py-3.5 text-center transition-all ${
            preview ? "border-violet-500/30 bg-violet-500/[0.07]" : "border-white/[0.07] bg-white/[0.03]"
          }`}>
            <p className="mb-1 text-[11px] uppercase tracking-widest text-zinc-500">닉네임 미리보기</p>
            <p className={`text-lg font-bold ${preview ? "text-white" : "text-zinc-600"}`}>
              {preview ?? "집단-나이-이름"}
            </p>
          </div>

          {error && (
            <p className="rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={(!preview && !avatarFile) || saving || uploadingAvatar}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 btn-glow"
          >
            {saving || uploadingAvatar ? "저장 중..." : "저장하기"}
          </button>
        </form>
      </div>
    </div>
  );
}
