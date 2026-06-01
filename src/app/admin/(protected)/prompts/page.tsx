"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/http";

type PromptVersion = {
  id: string;
  version: string;
  content: string;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
};

export default function AdminPromptsPage() {
  const [items, setItems] = useState<PromptVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchJson<{ ok: true; items: PromptVersion[] }>("/api/admin/prompts");
      setItems(data.items ?? []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }

  async function handleActivate(id: string) {
    setActivatingId(id);
    try {
      await fetchJson(`/api/admin/prompts/${id}/activate`, { method: "POST" });
      await load();
    } catch {
      /* ignore */
    }
    setActivatingId(null);
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">코어 프롬프트</h2>
          <p className="mt-1 text-sm text-zinc-500">
            유저에게 보여지는 프롬프트 버전을 관리합니다.
          </p>
        </div>
        <Link
          href="/admin/prompts/new"
          className="rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 btn-glow"
        >
          + 새 버전
        </Link>
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-white/[0.07] bg-[#111111] p-5"
            >
              <div className="mb-3 h-4 w-24 rounded bg-white/5" />
              <div className="mb-2 h-3 w-full rounded bg-white/5" />
              <div className="h-3 w-3/4 rounded bg-white/5" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-[#111111] px-8 py-14 text-center">
          <p className="mb-2 text-zinc-300">등록된 프롬프트 버전이 없습니다.</p>
          <Link
            href="/admin/prompts/new"
            className="mt-4 inline-block rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            첫 버전 추가하기
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className={`rounded-2xl border bg-[#111111] p-5 transition-all ${
                item.isActive
                  ? "border-emerald-500/30 bg-emerald-500/[0.03]"
                  : "border-white/[0.07]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  {/* 버전 + 상태 */}
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-semibold text-white">{item.version}</span>
                    {item.isActive && (
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                        활성
                      </span>
                    )}
                  </div>

                  {/* 메모 */}
                  {item.notes && (
                    <p className="mb-2 text-sm text-zinc-400">{item.notes}</p>
                  )}

                  {/* 미리보기 */}
                  <div className="rounded-xl border border-white/[0.06] bg-black/30 p-3">
                    <pre className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-500">
                      {item.content.slice(0, 250)}
                      {item.content.length > 250 ? "..." : ""}
                    </pre>
                  </div>

                  <p className="mt-2 text-xs text-zinc-600">
                    {new Date(item.createdAt).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {/* 버튼들 */}
                <div className="flex flex-col gap-2">
                  {!item.isActive && (
                    <button
                      onClick={() => handleActivate(item.id)}
                      disabled={activatingId === item.id}
                      className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-all hover:bg-emerald-500/20 disabled:opacity-40"
                    >
                      {activatingId === item.id ? "적용 중..." : "활성화"}
                    </button>
                  )}
                  <Link
                    href={`/admin/prompts/${item.id}/edit`}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-center text-xs font-medium text-zinc-400 transition-all hover:border-white/20 hover:text-zinc-200"
                  >
                    수정
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
