"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });

    if (error) {
      setError("이메일 전송에 실패했습니다. 다시 시도해주세요.");
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-xl font-bold">
            <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
              Blue
            </span>
            <span className="text-white">Humanity</span>
          </Link>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-1 text-lg font-bold text-white">비밀번호 재설정</h2>
          <p className="mb-6 text-xs text-zinc-500">
            가입한 이메일로 재설정 링크를 보내드립니다.
          </p>

          {sent ? (
            <div className="space-y-4 text-center">
              <div className="text-4xl">📬</div>
              <p className="text-sm text-zinc-300">
                <span className="font-semibold text-white">{email}</span>로<br />
                재설정 링크를 보냈습니다.
              </p>
              <p className="text-xs text-zinc-500">
                이메일이 오지 않으면 스팸함을 확인해 주세요.
              </p>
              <Link
                href="/login"
                className="mt-2 block text-xs text-violet-400 hover:text-violet-300"
              >
                로그인으로 돌아가기
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs text-zinc-400">이메일</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-500/10 px-4 py-2.5 text-xs text-red-400">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "전송 중..." : "재설정 링크 보내기"}
              </button>

              <Link
                href="/login"
                className="block pt-1 text-center text-xs text-zinc-500 hover:text-zinc-300"
              >
                ← 로그인으로 돌아가기
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
