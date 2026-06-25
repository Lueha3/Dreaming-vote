"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchJson } from "@/lib/http";
import { RoleBadge } from "@/components/RoleBadge";
import { ReportButton } from "@/components/ReportButton";
import { displayRoles, type Role } from "@/lib/roles";
import { timeAgo } from "@/lib/time";

type CommentItem = {
  id: string;
  content: string;
  createdAt: string;
  authorName: string;
  authorAvatar: string | null;
  authorRole: Role | null;
  isMine: boolean;
  canDelete: boolean;
};

type ListResponse = { ok: true; items: CommentItem[]; loggedIn: boolean };

/**
 * 광장 글 댓글 — 펼침 시 마운트되어 목록을 로드한다.
 * 작성/삭제 후 onCountChange로 부모의 댓글 수 배지를 동기화.
 */
export function PlazaComments({
  postId,
  loggedIn,
  onCountChange,
}: {
  postId: string;
  loggedIn: boolean;
  onCountChange: (delta: number) => void;
}) {
  const [items, setItems] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needJoin, setNeedJoin] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchJson<ListResponse>(`/api/prayers/${postId}/comments`);
      setItems(data.items ?? []);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text || posting) return;
    setPosting(true);
    setError(null);
    setNeedJoin(false);
    try {
      await fetchJson(`/api/prayers/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      setContent("");
      onCountChange(1);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.code === "membership_required") setNeedJoin(true);
      setError(err instanceof Error ? err.message : "댓글을 올리지 못했어요.");
    }
    setPosting(false);
  }

  async function remove(commentId: string) {
    // 낙관적 제거
    setItems((prev) => prev.filter((c) => c.id !== commentId));
    onCountChange(-1);
    try {
      await fetchJson(`/api/prayers/${postId}/comments/${commentId}`, { method: "DELETE" });
    } catch {
      onCountChange(1);
      await load(); // 실패 시 원복
    }
  }

  return (
    <div className="mt-3 space-y-3 border-t border-sky-line pt-3">
      {loading ? (
        <p className="text-xs text-ink-faint">댓글을 불러오는 중...</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-ink-faint">아직 댓글이 없어요. 첫 댓글을 남겨보세요.</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((c) => (
            <li key={c.id} className="flex items-start gap-2">
              {c.authorAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.authorAvatar} alt="" className="mt-0.5 h-6 w-6 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-skyx/20 text-[10px] text-skyx-ink">
                  {c.authorName[0]}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-medium text-ink">{c.authorName}</span>
                  {displayRoles(c.authorRole).map((r) => (
                    <RoleBadge key={r} role={r} size="sm" />
                  ))}
                  <span className="text-xs text-ink-faint">· {timeAgo(c.createdAt)}</span>
                  {c.canDelete && (
                    <button
                      onClick={() => remove(c.id)}
                      className="ml-auto text-xs text-ink-faint transition-colors hover:text-red-500"
                    >
                      삭제
                    </button>
                  )}
                </div>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-soft">
                  {c.content}
                </p>
                {loggedIn && !c.isMine && (
                  <div className="mt-1">
                    <ReportButton targetType="comment" targetId={c.id} />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {loggedIn && (
        <form onSubmit={handlePost} className="flex items-center gap-2">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={500}
            placeholder="댓글 달기..."
            className="min-w-0 flex-1 rounded-full border border-white/95 bg-white/70 px-4 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-teal focus:outline-none"
          />
          <button
            type="submit"
            disabled={!content.trim() || posting}
            className="btn-gold shrink-0 rounded-full px-4 py-2 text-xs disabled:opacity-40"
          >
            {posting ? "..." : "등록"}
          </button>
        </form>
      )}
      {error && (
        <p className="text-xs text-red-500">
          {error}
          {needJoin && (
            <a href="/join" className="ml-1.5 font-semibold text-gold-ink underline underline-offset-2">
              가입 신청하러 가기 →
            </a>
          )}
        </p>
      )}
    </div>
  );
}
