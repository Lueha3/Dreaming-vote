"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type PageProps = { params: Promise<{ id: string }> | { id: string } };

export default function EditPromptPage({ params }: PageProps) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [version, setVersion] = useState("");
  const [content, setContent] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const resolve = async () => {
      const resolved = params instanceof Promise ? await params : params;
      setId(resolved.id);
    };
    resolve();
  }, [params]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/prompts`)
      .then((r) => r.json())
      .then((data) => {
        const item = data.items?.find(
          (i: { id: string; version: string; content: string; notes?: string }) => i.id === id,
        );
        if (item) {
          setVersion(item.version);
          setContent(item.content);
          setNotes(item.notes ?? "");
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/admin/prompts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, notes }),
    });
    const data = await res.json();

    if (data.ok) {
      router.push("/admin/prompts");
    } else {
      setError(data.error ?? "오류가 발생했습니다.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-5">
        <div className="h-8 w-48 rounded bg-white/5" />
        <div className="rounded-2xl border border-white/[0.07] bg-[#141418] p-6 space-y-4">
          <div className="h-32 rounded bg-white/5" />
          <div className="h-8 rounded bg-white/5" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">프롬프트 수정</h2>
        <p className="mt-1 text-sm text-zinc-500">
          <span className="font-medium text-zinc-400">{version}</span> 버전을 수정합니다.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-2xl border border-white/[0.07] bg-[#141418] p-6 space-y-5">
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
              required
            />
            <p className="mt-1.5 text-right text-xs text-zinc-600">{content.length}자</p>
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
              placeholder="수정 내용 메모..."
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
