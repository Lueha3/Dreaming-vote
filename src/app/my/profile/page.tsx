"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const NICKNAME_RE = /^(러비아|유디코)-\d{2}-.+$/;

function getGroup(age: number): "러비아" | "유디코" | null {
  if (age >= 20 && age <= 26) return "러비아";
  if (age >= 27 && age <= 34) return "유디코";
  return null;
}

export default function ProfilePage() {
  const router = useRouter();
  const [currentNickname, setCurrentNickname] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notLoggedIn, setNotLoggedIn] = useState(false);

  const [age, setAge] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const ageNum = parseInt(age, 10);
  const group = !isNaN(ageNum) ? getGroup(ageNum) : null;
  const preview = group && name.trim() ? `${group}-${ageNum}-${name.trim()}` : null;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setNotLoggedIn(true); setLoading(false); return; }
      const nick = user.user_metadata?.full_name ?? null;
      setCurrentNickname(nick);
      // 이미 올바른 형식이면 기존 값 파싱해서 폼에 채우기
      if (nick && NICKNAME_RE.test(nick)) {
        const parts = nick.split("-");
        setAge(parts[1] ?? "");
        setName(parts.slice(2).join("-") ?? "");
      }
      setLoading(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!preview) return;
    setError(null);
    setSaving(true);

    const supabase = createClient();

    // 1. Supabase 메타데이터 업데이트
    const { error: supaErr } = await supabase.auth.updateUser({
      data: { full_name: preview },
    });

    if (supaErr) {
      setError("저장에 실패했습니다. 다시 시도해주세요.");
      setSaving(false);
      return;
    }

    // 2. Prisma 닉네임 업데이트
    const res = await fetch("/api/my/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: preview }),
    });

    if (!res.ok) {
      setError("저장에 실패했습니다. 다시 시도해주세요.");
      setSaving(false);
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/my"), 1500);
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500/30 border-t-violet-400" />
      </div>
    );
  }

  if (notLoggedIn) {
    return (
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
  }

  if (done) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center text-center">
        <div>
          <div className="mb-4 text-4xl">✅</div>
          <p className="text-lg font-bold text-white">{preview} 로 설정됐습니다!</p>
          <p className="mt-2 text-sm text-zinc-500">잠시 후 이동합니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] bg-[#0a0a0a] text-white">
      <div className="mx-auto max-w-sm px-4 py-12">
        {/* 뒤로 */}
        <Link href="/my" className="mb-6 inline-block text-xs text-zinc-500 hover:text-zinc-300">
          ← 내 정보
        </Link>

        <h1 className="mb-1 text-xl font-bold text-white">닉네임 설정</h1>
        <p className="mb-8 text-sm text-zinc-500 leading-relaxed">
          교회 청년부 집단·나이·이름 형식으로 설정해야 동아리 활동에 참여할 수 있어요.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-2xl border border-white/[0.07] bg-[#111111] p-5 space-y-5">

            {/* 나이 */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                나이 <span className="text-zinc-600">(만 나이 기준 · 20~34세)</span>
              </label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                min={20}
                max={34}
                placeholder="예: 31"
                required
                className="w-full rounded-xl border border-white/[0.07] bg-black/30 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
              />
              {/* 집단 표시 */}
              {age && (
                <div className="mt-2">
                  {group ? (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                      group === "러비아"
                        ? "bg-blue-500/15 text-blue-300 border border-blue-500/25"
                        : "bg-violet-500/15 text-violet-300 border border-violet-500/25"
                    }`}>
                      ✓ {group} 소속
                    </span>
                  ) : (
                    <span className="text-xs text-red-400">20~34세만 가입 가능합니다.</span>
                  )}
                </div>
              )}
            </div>

            {/* 이름 */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 이정현"
                required
                maxLength={20}
                className="w-full rounded-xl border border-white/[0.07] bg-black/30 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
              />
            </div>
          </div>

          {/* 미리보기 */}
          <div className={`rounded-xl border px-4 py-3.5 text-center transition-all ${
            preview
              ? "border-violet-500/30 bg-violet-500/[0.07]"
              : "border-white/[0.07] bg-white/[0.03]"
          }`}>
            <p className="mb-1 text-[11px] text-zinc-500 uppercase tracking-widest">닉네임 미리보기</p>
            <p className={`text-lg font-bold ${preview ? "text-white" : "text-zinc-600"}`}>
              {preview ?? "집단-나이-이름"}
            </p>
          </div>

          {error && (
            <p className="rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={!preview || saving}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 btn-glow"
          >
            {saving ? "저장 중..." : "닉네임 저장하기"}
          </button>
        </form>
      </div>
    </div>
  );
}
