"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const trimmed = secret.trim();
    if (!trimmed) {
      setError("비밀번호를 입력해주세요.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: trimmed }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "로그인에 실패했습니다.");
        setLoading(false);
        return;
      }

      // 쿠키가 설정되었으므로 관리자 페이지로 이동
      router.push("/admin/recruitments");
    } catch (e) {
      setError("로그인 중 오류가 발생했습니다.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-md px-4 py-16">
        <h2 className="mb-6 text-xl font-bold">관리자 비밀번호</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              관리자 비밀번호
            </label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="ADMIN_SECRET"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}

