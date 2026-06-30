"use client";

import { useEffect, useRef, useState } from "react";
import { RoleBadge } from "@/components/RoleBadge";
import { ReportButton } from "@/components/ReportButton";
import { displayRoles } from "@/lib/roles";
import { timeAgo, isEdited } from "@/lib/time";
import { PlazaComments } from "./PlazaComments";
import type { PlazaPost } from "./types";

/** 글당 1~3장 이미지 — 가로 스와이프 캐러셀 */
function ImageCarousel({ images, onOpen }: { images: string[]; onOpen: (index: number) => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <button
        type="button"
        onClick={() => onOpen(0)}
        className="mt-3 block w-full overflow-hidden rounded-xl border border-sky-line bg-white/55"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[0]} alt="" className="w-full max-h-96 object-contain" />
      </button>
    );
  }

  return (
    <div className="mt-3">
      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-xl"
        style={{ scrollbarWidth: "none" }}
        onScroll={() => {
          const el = scrollRef.current;
          if (!el) return;
          setActiveIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {images.map((url, i) => (
          <button
            key={url}
            type="button"
            onClick={() => onOpen(i)}
            className="aspect-square w-full flex-none snap-start overflow-hidden border border-sky-line bg-white/55 first:rounded-l-xl last:rounded-r-xl"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex justify-center gap-1">
        {images.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-200 ${
              i === activeIndex ? "h-1.5 w-4 bg-skyx-deep" : "h-1.5 w-1.5 bg-ink-faint"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export function PlazaPostCard({
  post,
  loggedIn,
  onReact,
  onDelete,
  onAnswered,
  onEdit,
  onCommentDelta,
}: {
  post: PlazaPost;
  loggedIn: boolean;
  onReact: (post: PlazaPost) => void;
  onDelete: (post: PlazaPost) => void;
  onAnswered: (post: PlazaPost, note: string) => void;
  onEdit: (post: PlazaPost, content: string, images: string[]) => void;
  onCommentDelta: (postId: string, delta: number) => void;
}) {
  const isPrayer = post.category === "기도해주세요";

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [answerNote, setAnswerNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editImages, setEditImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const touchStartX = useRef<number>(0);

  // 라이트박스 키보드 탐색
  useEffect(() => {
    if (lightboxIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft")
        setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i));
      if (e.key === "ArrowRight")
        setLightboxIndex((i) => (i !== null && i < post.images.length - 1 ? i + 1 : i));
      if (e.key === "Escape") setLightboxIndex(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, post.images.length]);

  return (
    <li id={post.id} className={`glass-card scroll-mt-24 p-5 transition-all ${post.isAnswered ? "border-teal/45!" : ""}`}>
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
          {isEdited(post.createdAt, post.updatedAt) && (
            <span className="text-xs text-ink-faint">· 수정됨</span>
          )}
        </div>
        {isPrayer && post.isAnswered && (
          <span className="rounded-full border border-teal/35 bg-teal/10 px-2.5 py-0.5 text-xs font-medium text-teal-ink">
            응답됨 🌿
          </span>
        )}
      </div>

      {/* 내용 */}
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={3}
            maxLength={2000}
            autoFocus
            className="w-full resize-none rounded-xl border border-white/95 bg-white/70 px-3.5 py-2.5 text-sm leading-relaxed text-ink focus:border-teal focus:outline-none"
          />
          {editImages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {editImages.map((url) => (
                <div
                  key={url}
                  className="relative h-20 w-20 overflow-hidden rounded-lg border border-sky-line bg-white/55"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setEditImages((imgs) => imgs.filter((u) => u !== url))}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-xs text-white transition-colors hover:bg-black/70"
                    aria-label="이미지 삭제"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => { onEdit(post, editContent, editImages); setEditing(false); }}
              disabled={!editContent.trim() && editImages.length === 0}
              className="btn-gold flex-1 rounded-xl py-2 text-sm disabled:opacity-40"
            >
              저장
            </button>
            <button
              onClick={() => setEditing(false)}
              className="glass-soft rounded-xl px-4 py-2 text-sm text-ink-soft hover:bg-white/90 hover:text-ink"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        post.content && (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">{post.content}</p>
        )
      )}

      {/* 이미지 캐러셀 */}
      {!editing && <ImageCarousel images={post.images} onOpen={setLightboxIndex} />}

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
          {post.canEdit && !editing && (
            <button
              onClick={() => { setEditContent(post.content); setEditImages(post.images); setEditing(true); }}
              className="text-ink-faint hover:text-ink"
            >
              수정
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

      {/* 신고 (본인 글 제외) */}
      {loggedIn && !post.isMine && (
        <div className="mt-2 flex justify-end">
          <ReportButton targetType="prayer" targetId={post.id} />
        </div>
      )}

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

      {/* 이미지 라이트박스 (캐러셀) */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightboxIndex(null)}
          onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            if (dx < -50 && lightboxIndex < post.images.length - 1) {
              e.stopPropagation();
              setLightboxIndex(lightboxIndex + 1);
            } else if (dx > 50 && lightboxIndex > 0) {
              e.stopPropagation();
              setLightboxIndex(lightboxIndex - 1);
            }
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.images[lightboxIndex]}
            alt=""
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* 닫기 */}
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(null); }}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg text-white backdrop-blur-sm hover:bg-white/30"
            aria-label="닫기"
          >
            ✕
          </button>

          {/* 이전 */}
          {lightboxIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-2xl text-white backdrop-blur-sm hover:bg-white/35"
              aria-label="이전"
            >
              ‹
            </button>
          )}

          {/* 다음 */}
          {lightboxIndex < post.images.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-2xl text-white backdrop-blur-sm hover:bg-white/35"
              aria-label="다음"
            >
              ›
            </button>
          )}

          {/* 페이지 표시 */}
          {post.images.length > 1 && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-xs text-white/80 backdrop-blur-sm">
              {lightboxIndex + 1} / {post.images.length}
            </div>
          )}
        </div>
      )}
    </li>
  );
}
