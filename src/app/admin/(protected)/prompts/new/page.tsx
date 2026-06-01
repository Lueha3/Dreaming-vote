"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewPromptPage() {
  const router = useRouter();
  const [version, setVersion] = useState("v2.0");
  const [content, setContent] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/admin/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version, content, notes }),
    });
    const data = await res.json();

    if (data.ok) {
      router.push("/admin/prompts");
    } else {
      setError(data.error ?? "오류가 발생했습니다.");
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">새 프롬프트 버전</h2>
        <p className="mt-1 text-sm text-zinc-500">
          새 버전을 추가한 뒤 활성화해야 유저에게 반영됩니다.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-2xl border border-white/[0.07] bg-[#141418] p-6 space-y-5">
          {/* 버전 이름 */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
              버전 이름
            </label>
            <input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="w-full rounded-xl border border-white/[0.07] bg-black/30 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
              placeholder="v2.0"
              required
            />
          </div>

          {/* 프롬프트 내용 */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
              프롬프트 내용
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={14}
              className="w-full rounded-xl border border-white/[0.07] bg-black/30 px-4 py-3 font-mono text-sm leading-relaxed text-zinc-300 placeholder-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
              placeholder="유저가 AI에 붙여넣을 코어 프롬프트..."
              required
            />
            <p className="mt-1.5 text-right text-xs text-zinc-600">
              {content.length}자
            </p>
          </div>

          {/* 변경 메모 */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
              변경 메모{" "}
              <span className="font-normal text-zinc-600">(선택)</span>
            </label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-white/[0.07] bg-black/30 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
              placeholder="이번 버전에서 변경한 내용..."
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 btn-glow"
          >
            {saving ? "저장 중..." : "저장하기"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-zinc-400 transition-all hover:border-white/20 hover:text-zinc-200"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
