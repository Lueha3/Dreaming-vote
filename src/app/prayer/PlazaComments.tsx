"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, fetchJson } from "@/lib/http";
import { RoleBadge } from "@/components/RoleBadge";
import { NewcomerBadge } from "@/components/NewcomerBadge";
import { ReportButton } from "@/components/ReportButton";
import { displayRoles, type Role } from "@/lib/roles";
import { timeAgo, isEdited } from "@/lib/time";

type CommentItem = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  authorName: string;
  authorAvatar: string | null;
  authorRole: Role | null;
  isNewcomer: boolean;
  isMine: boolean;
  canDelete: boolean;
  canEdit: boolean;
};

type TopComment = CommentItem & { replies: CommentItem[] };

type ListResponse = { ok: true; items: TopComment[]; loggedIn: boolean };

/** 엔터 = 줄바꿈만, 전송은 버튼으로만 — textarea + form이므로 Enter가 자동 submit하지 않는다. */
function CommentComposer({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder,
  submitLabel,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled: boolean;
  placeholder: string;
  submitLabel: string;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value]);

  return (
    <form onSubmit={onSubmit} className="flex items-end gap-2">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={1}
        maxLength={500}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="min-w-0 flex-1 resize-none rounded-2xl border border-white/95 bg-white/70 px-4 py-2 text-sm leading-relaxed text-ink placeholder:text-ink-faint focus:border-teal focus:outline-none"
      />
      <button
        type="submit"
        disabled={disabled}
        className="btn-gold shrink-0 rounded-full px-4 py-2 text-xs disabled:opacity-40"
      >
        {submitLabel}
      </button>
    </form>
  );
}

function CommentRow({
  comment,
  loggedIn,
  onDelete,
  onEdit,
  onReply,
}: {
  comment: CommentItem;
  loggedIn: boolean;
  onDelete: () => void;
  onEdit: (content: string) => void;
  onReply?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  return (
    <div className="flex items-start gap-2">
      {comment.authorAvatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={comment.authorAvatar} alt="" className="mt-0.5 h-6 w-6 shrink-0 rounded-full object-cover" />
      ) : (
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-skyx/20 text-[10px] text-skyx-ink">
          {comment.authorName[0]}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-ink">{comment.authorName}</span>
          {displayRoles(comment.authorRole).map((r) => (
            <RoleBadge key={r} role={r} size="sm" />
          ))}
          {comment.isNewcomer && <NewcomerBadge size="sm" />}
          <span className="text-xs text-ink-faint">· {timeAgo(comment.createdAt)}</span>
          {isEdited(comment.createdAt, comment.updatedAt) && (
            <span className="text-xs text-ink-faint">· 수정됨</span>
          )}
          <span className="ml-auto flex items-center gap-2">
            {comment.canEdit && !editing && (
              <button
                onClick={() => { setEditContent(comment.content); setEditing(true); }}
                className="text-xs text-ink-faint transition-colors hover:text-ink"
              >
                수정
              </button>
            )}
            {comment.canDelete && (
              <button
                onClick={onDelete}
                className="text-xs text-ink-faint transition-colors hover:text-red-500"
              >
                삭제
              </button>
            )}
          </span>
        </div>
        {editing ? (
          <div className="mt-1 space-y-1.5">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={2}
              maxLength={500}
              autoFocus
              className="w-full resize-none rounded-xl border border-white/95 bg-white/70 px-3 py-2 text-sm leading-relaxed text-ink focus:border-teal focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { onEdit(editContent); setEditing(false); }}
                disabled={!editContent.trim()}
                className="btn-gold rounded-full px-3.5 py-1 text-xs disabled:opacity-40"
              >
                저장
              </button>
              <button
                onClick={() => setEditing(false)}
                className="glass-soft rounded-full px-3.5 py-1 text-xs text-ink-soft hover:text-ink"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-soft">
            {comment.content}
          </p>
        )}
        <div className="mt-1 flex items-center gap-3">
          {onReply && (
            <button onClick={onReply} className="text-xs text-ink-faint transition-colors hover:text-skyx-ink">
              답글
            </button>
          )}
          {loggedIn && !comment.isMine && <ReportButton targetType="comment" targetId={comment.id} />}
        </div>
      </div>
    </div>
  );
}

/**
 * 광장 글 댓글 — 펼침 시 마운트되어 목록을 로드한다. 답글(대댓글)은 단일 깊이로 부모 아래 표시.
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
  const [items, setItems] = useState<TopComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyPosting, setReplyPosting] = useState(false);
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

  async function handleReply(e: React.FormEvent, parentId: string) {
    e.preventDefault();
    const text = replyContent.trim();
    if (!text || replyPosting) return;
    setReplyPosting(true);
    setError(null);
    setNeedJoin(false);
    try {
      await fetchJson(`/api/prayers/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, parentId }),
      });
      setReplyContent("");
      setReplyingTo(null);
      onCountChange(1);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.code === "membership_required") setNeedJoin(true);
      setError(err instanceof Error ? err.message : "답글을 올리지 못했어요.");
    }
    setReplyPosting(false);
  }

  async function editComment(c: CommentItem, content: string, parentId?: string) {
    const trimmed = content.trim();
    const prev = c.content;
    // 낙관적 갱신 — 실패 시 원복
    setItems((items) =>
      items.map((p) => {
        if (parentId) {
          if (p.id !== parentId) return p;
          return { ...p, replies: p.replies.map((r) => (r.id === c.id ? { ...r, content: trimmed } : r)) };
        }
        return p.id === c.id ? { ...p, content: trimmed } : p;
      }),
    );
    try {
      await fetchJson(`/api/prayers/${postId}/comments/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      await load();
    } catch (err) {
      setItems((items) =>
        items.map((p) => {
          if (parentId) {
            if (p.id !== parentId) return p;
            return { ...p, replies: p.replies.map((r) => (r.id === c.id ? { ...r, content: prev } : r)) };
          }
          return p.id === c.id ? { ...p, content: prev } : p;
        }),
      );
      setError(err instanceof Error ? err.message : "댓글을 수정하지 못했어요.");
    }
  }

  async function remove(c: CommentItem & { replies?: CommentItem[] }, parentId?: string) {
    const delta = -(1 + (c.replies?.length ?? 0));
    // 낙관적 제거 — 부모 삭제 시 그 아래 답글도 함께 사라진다.
    setItems((prev) => {
      if (parentId) {
        return prev.map((p) =>
          p.id === parentId ? { ...p, replies: p.replies.filter((r) => r.id !== c.id) } : p,
        );
      }
      return prev.filter((x) => x.id !== c.id);
    });
    onCountChange(delta);
    try {
      await fetchJson(`/api/prayers/${postId}/comments/${c.id}`, { method: "DELETE" });
    } catch {
      onCountChange(-delta);
      await load(); // 실패 시 원복
    }
  }

  function startReply(commentId: string) {
    setReplyingTo((prev) => (prev === commentId ? null : commentId));
    setReplyContent("");
  }

  return (
    <div className="mt-3 space-y-3 border-t border-sky-line pt-3">
      {loading ? (
        <p className="text-xs text-ink-faint">댓글을 불러오는 중...</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-ink-faint">아직 댓글이 없어요. 첫 댓글을 남겨보세요.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((c) => (
            <li key={c.id}>
              <CommentRow
                comment={c}
                loggedIn={loggedIn}
                onDelete={() => remove(c)}
                onEdit={(content) => editComment(c, content)}
                onReply={loggedIn ? () => startReply(c.id) : undefined}
              />

              {c.replies.length > 0 && (
                <ul className="mt-2 ml-8 space-y-2.5 border-l border-sky-line pl-3">
                  {c.replies.map((r) => (
                    <li key={r.id}>
                      <CommentRow
                        comment={r}
                        loggedIn={loggedIn}
                        onDelete={() => remove(r, c.id)}
                        onEdit={(content) => editComment(r, content, c.id)}
                      />
                    </li>
                  ))}
                </ul>
              )}

              {replyingTo === c.id && (
                <div className="mt-2 ml-8">
                  <CommentComposer
                    value={replyContent}
                    onChange={setReplyContent}
                    onSubmit={(e) => handleReply(e, c.id)}
                    disabled={!replyContent.trim() || replyPosting}
                    placeholder="답글 달기..."
                    submitLabel={replyPosting ? "..." : "등록"}
                    autoFocus
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {loggedIn && (
        <CommentComposer
          value={content}
          onChange={setContent}
          onSubmit={handlePost}
          disabled={!content.trim() || posting}
          placeholder="댓글 달기..."
          submitLabel={posting ? "..." : "등록"}
        />
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
