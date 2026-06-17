"use client";

import { useState } from "react";
import { RoleBadge } from "@/components/RoleBadge";
import { displayRoles } from "@/lib/roles";
import { timeAgo } from "@/lib/time";
import { PlazaComments } from "./PlazaComments";
import type { PlazaPost } from "./types";

/** 글당 1~3장 이미지 그리드 — 클릭 시 라이트박스 */
function ImageGrid({ images, onOpen }: { images: string[]; onOpen: (url: string) => void }) {
  if (images.length === 0) return null;
  const cols = images.length === 1 ? "grid-cols-1" : images.length === 2 ? "grid-cols-2" : "grid-cols-3";
  return (
    <div className={`mt-3 grid gap-1.5 ${cols}`}>
      {images.map((url) => (
        <button
          key={url}
          type="button"
          onClick={() => onOpen(url)}
          className={`overflow-hidden rounded-xl border border-sky-line bg-white/55 ${
            images.length === 1 ? "max-h-96" : "aspect-square"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            className={`w-full ${images.length === 1 ? "max-h-96 object-contain" : "h-full object-cover"}`}
          />
        </button>
      ))}
    </div>
  );
}

export function PlazaPostCard({
  post,
  loggedIn,
  onReact,
  onDelete,
  onAnswered,
  onCommentDelta,
}: {
  post: PlazaPost;
  loggedIn: boolean;
  onReact: (post: PlazaPost) => void;
  onDelete: (post: PlazaPost) => void;
  onAnswered: (post: PlazaPost, note: string) => void;
  onCommentDelta: (postId: string, delta: number) => void;
}) {
  const isPrayer = post.category === "기도해주세요";

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [answerNote, setAnswerNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  return (
    <li className={`glass-card p-5 transition-all ${post.isAnswered ? "border-teal/45!" : ""}`}>
      {/* 작성자 + 시간 */}
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {post.authorAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.authorAvatar} alt="" className="h-6 w-6 rounded-full object-cover" />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-skyx/25 text-xs text-skyx-ink">
              {post.authorName[0]}
            </div>
          )}
          <span className="text-xs text-ink-soft">{post.authorName}</span>
          {displayRoles(post.authorRole).map((r) => (
            <RoleBadge key={r} role={r} size="sm" />
          ))}
          <span className="text-xs text-ink-faint">· {timeAgo(post.createdAt)}</span>
        </div>
        {isPrayer && post.isAnswered && (
          <span className="rounded-full border border-teal/35 bg-teal/10 px-2.5 py-0.5 text-xs font-medium text-teal-ink">
            응답됨 🌿
          </span>
        )}
      </div>

      {/* 내용 */}
      {post.content && (
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">{post.content}</p>
      )}

      {/* 이미지 */}
      <ImageGrid images={post.images} onOpen={setLightbox} />

      {/* 응답 간증 */}
      {isPrayer && post.isAnswered && post.answeredNote && (
        <p className="mt-2 rounded-xl border border-teal/25 bg-teal/[0.07] px-3 py-2 text-xs leading-relaxed text-teal-ink">
          🌿 {post.answeredNote}
        </p>
      )}

      {/* 액션 바 */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onReact(post)}
            disabled={!loggedIn}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all disabled:opacity-40 ${
              post.iReacted
                ? isPrayer
                  ? "border border-gold/45 bg-gold/15 text-gold-ink"
                  : "border border-rose-300/60 bg-rose-50 text-rose-500"
                : "glass-soft text-ink-soft hover:bg-white/90 hover:text-ink"
            }`}
          >
            {isPrayer ? (
              <>🙏 {post.iReacted ? "기도했어요" : "기도할게요"}</>
            ) : (
              <>{post.iReacted ? "💙" : "🤍"} 공감</>
            )}
            {post.reactionCount > 0 && <span className="text-ink-faint">· {post.reactionCount}</span>}
          </button>

          <button
            onClick={() => setCommentsOpen((o) => !o)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
              commentsOpen
                ? "bg-skyx/20 text-skyx-ink ring-1 ring-skyx/40"
                : "glass-soft text-ink-soft hover:bg-white/90 hover:text-ink"
            }`}
          >
            💬 댓글
            {post.commentCount > 0 && <span className="text-ink-faint">· {post.commentCount}</span>}
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {isPrayer && post.isMine && !post.isAnswered && (
            <button
              onClick={() => { setAnswering(true); setAnswerNote(""); }}
              className="text-teal-ink hover:text-teal-deep"
            >
              응답됨 표시
            </button>
          )}
          {post.canDelete &&
            (confirmDelete ? (
              <span className="flex items-center gap-1.5">
                <span className="text-ink-soft">삭제할까요?</span>
                <button onClick={() => onDelete(post)} className="font-medium text-red-500 hover:text-red-400">
                  예
                </button>
                <button onClick={() => setConfirmDelete(false)} className="text-ink-faint hover:text-ink">
                  취소
                </button>
              </span>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="text-ink-faint hover:text-red-500">
                삭제
              </button>
            ))}
        </div>
      </div>

      {/* 응답 간증 인라인 입력 */}
      {answering && (
        <div className="mt-3 space-y-2 border-t border-sky-line pt-3">
          <input
            value={answerNote}
            onChange={(e) => setAnswerNote(e.target.value)}
            maxLength={200}
            placeholder="응답 간증 한 줄 (선택, 비워도 됩니다)"
            className="w-full rounded-xl border border-white/95 bg-white/70 px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-teal focus:outline-none"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={() => { onAnswered(post, answerNote); setAnswering(false); }}
              className="btn-gold flex-1 rounded-xl py-2 text-sm"
            >
              응답 표시하기
            </button>
            <button
              onClick={() => { setAnswering(false); setAnswerNote(""); }}
              className="glass-soft rounded-xl px-4 py-2 text-sm text-ink-soft hover:bg-white/90 hover:text-ink"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 댓글 */}
      {commentsOpen && (
        <PlazaComments
          postId={post.id}
          loggedIn={loggedIn}
          onCountChange={(delta) => onCommentDelta(post.id, delta)}
        />
      )}

      {/* 이미지 라이트박스 */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-h-[90vh] max-w-full rounded-lg object-contain" />
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg text-white backdrop-blur-sm hover:bg-white/30"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
      )}
    </li>
  );
}
