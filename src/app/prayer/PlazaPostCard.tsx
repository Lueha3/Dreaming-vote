"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { RoleBadge } from "@/components/RoleBadge";
import { NewcomerBadge } from "@/components/NewcomerBadge";
import { ReportButton } from "@/components/ReportButton";
import { useProfilePeek } from "@/components/ProfilePeek";
import { CLUB_CATEGORY_META } from "@/lib/clubCategories";
import { ClubCategoryIcon } from "@/components/icons";
import { displayRoles } from "@/lib/roles";
import { timeAgo, isEdited } from "@/lib/time";
import { PlazaComments } from "./PlazaComments";
import type { PlazaClubRef, PlazaPost } from "./types";

// 더블탭(더블클릭) 판정 창 — 이 안에 두 번째 탭이 오면 더블탭, 아니면 그 시간 뒤 싱글탭(라이트박스)으로 확정.
const DOUBLE_TAP_MS = 300;

// Date.now() 호출을 컴포넌트 함수 밖(모듈 스코프)에 둬 렌더 순수성 규칙을 건드리지 않는다.
function isDoubleTap(lastTapAtRef: { current: number }): boolean {
  const now = Date.now();
  const isDouble = lastTapAtRef.current > 0 && now - lastTapAtRef.current < DOUBLE_TAP_MS;
  lastTapAtRef.current = isDouble ? 0 : now;
  return isDouble;
}

/** 하트 버스트 — 더블탭 위치에 잠깐 떴다 사라지는 큰 하트(공감과 동일한 ❤️). */
function HeartBurst({ burstKey }: { burstKey: number }) {
  return (
    <span
      key={burstKey}
      className="heart-burst-play pointer-events-none absolute inset-0 grid place-items-center text-6xl"
      aria-hidden
    >
      ❤️
    </span>
  );
}

/** 글당 1~5장 이미지 — 가로 스와이프 캐러셀. 사진을 더블탭하면 인스타처럼 공감 처리. */
function ImageCarousel({
  images,
  onOpen,
  iReacted,
  onDoubleTapLike,
}: {
  images: string[];
  onOpen: (index: number) => void;
  iReacted: boolean;
  onDoubleTapLike: () => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [burst, setBurst] = useState<{ index: number; key: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTapAtRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstKeyRef = useRef(0);

  // 언마운트(댓글 펼침 등으로 카드가 걷힐 때) 시 남은 싱글탭 타이머 정리.
  useEffect(() => {
    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    };
  }, []);

  function handleTap(index: number) {
    if (isDoubleTap(lastTapAtRef)) {
      // 더블탭 — 대기 중이던 싱글탭(라이트박스 오픈)은 취소.
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
        tapTimerRef.current = null;
      }
      burstKeyRef.current += 1;
      setBurst({ index, key: burstKeyRef.current });
      // 인스타 방식 — 더블탭은 항상 '공감'만 한다(이미 공감했으면 취소하지 않음).
      if (!iReacted) onDoubleTapLike();
      return;
    }

    tapTimerRef.current = setTimeout(() => {
      onOpen(index);
      tapTimerRef.current = null;
    }, DOUBLE_TAP_MS);
  }

  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <button
        type="button"
        onClick={() => handleTap(0)}
        /* min-h — 지연 로딩된 이미지가 도착하기 전 높이 0으로 접히면 스크롤이 튀고,
           브라우저가 '전부 화면 안'으로 판단해 지연 로딩이 무력화된다. */
        className="relative mt-3 flex min-h-[200px] w-full items-center justify-center overflow-hidden rounded-xl border border-sky-line bg-white/55"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[0]}
          alt=""
          loading="lazy"
          decoding="async"
          className="max-h-96 w-full object-contain"
        />
        {burst?.index === 0 && <HeartBurst burstKey={burst.key} />}
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
            onClick={() => handleTap(i)}
            className="relative aspect-square w-full flex-none snap-start overflow-hidden border border-sky-line bg-white/55 first:rounded-l-xl last:rounded-r-xl"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
            {burst?.index === i && <HeartBurst burstKey={burst.key} />}
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

/** 동아리광고 글 하단 — 첨부된 동아리로 바로 이동하는 미리보기 카드 */
function ClubAdCard({ club }: { club: PlazaClubRef }) {
  const meta = CLUB_CATEGORY_META[club.category];
  const visible = club.isApproved && club.isActive;
  const isFull = club.maxMembers != null && club.memberCount >= club.maxMembers;

  const cover = club.imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={club.imageUrl}
      alt=""
      loading="lazy"
      decoding="async"
      className="h-14 w-14 shrink-0 rounded-xl object-cover"
    />
  ) : (
    <div
      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${
        meta?.gradient ?? "from-skyx/30 to-teal/15"
      }`}
    >
      <ClubCategoryIcon category={club.category} className="h-6 w-6" />
    </div>
  );

  const body = (
    <div className="flex items-center gap-3 rounded-2xl border border-white/85 bg-white/60 p-3 transition-all hover:bg-white/85">
      {cover}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{club.name}</p>
        <p className="truncate text-xs text-ink-faint">
          {!visible
            ? "지금은 모집하지 않는 동아리예요"
            : isFull
              ? `${club.category} · 정원이 가득 찼어요`
              : `${club.category} · 멤버 ${club.memberCount}${club.maxMembers ? `/${club.maxMembers}` : ""}명`}
        </p>
      </div>
      {visible && <span className="shrink-0 text-xs font-semibold text-teal-ink">구경하기 →</span>}
    </div>
  );

  if (!visible) return <div className="mt-3 opacity-60">{body}</div>;

  return (
    <Link href={`/clubs/${club.id}`} className="mt-3 block">
      {body}
    </Link>
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
  const isWelcome = post.systemType === "welcome";

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [answerNote, setAnswerNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editImages, setEditImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const touchStartX = useRef<number>(0);
  const moreRef = useRef<HTMLDivElement>(null);
  const { open: openPeek } = useProfilePeek();

  const canReport = loggedIn && !post.isMine;
  const canMarkAnswered = isPrayer && post.isMine && !post.isAnswered;
  const hasMoreActions = canMarkAnswered || post.canEdit || canReport || post.canDelete;

  // 외부 클릭 시 ⋯ 메뉴 닫기 (Header 햄버거 메뉴와 동일한 패턴)
  useEffect(() => {
    if (!moreOpen) return;
    function handle(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [moreOpen]);

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
    <li
      id={post.id}
      className={`glass-card scroll-mt-24 p-5 transition-all ${
        post.isAnswered ? "border-teal/45!" : isWelcome ? "border-gold/45!" : ""
      }`}
    >
      {/* 시스템 카드(환영 등) 표시줄 */}
      {isWelcome && (
        <p className="mb-2 text-xs font-semibold text-gold-ink">🎉 새가족이 왔어요</p>
      )}
      {/* 작성자 + 시간 */}
      <div className="mb-2.5 flex items-start justify-between gap-2">
        {/* flex-wrap 필수 — 이름·배지·시간을 한 줄에 못 담으면 항목 단위로 다음 줄에 내린다.
            wrap이 없으면 아바타·배지가 shrink-0라 시간 텍스트만 짜부라져
            '· 1일 전'이 '1일 / 전'처럼 문구 중간에서 잘린다(댓글·모임 후기는 이미 wrap 방식). */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          {post.authorId ? (
            <button
              type="button"
              onClick={() => openPeek(post.authorId!)}
              aria-label={`${post.authorName} 프로필 보기`}
              className="shrink-0"
            >
              {post.authorAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.authorAvatar}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-skyx/25 text-xs text-skyx-ink">
                  {post.authorName[0]}
                </div>
              )}
            </button>
          ) : (
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-skyx/25 text-xs text-skyx-ink">
              {post.authorName[0]}
            </div>
          )}
          <span className="max-w-full truncate text-xs text-ink-soft">{post.authorName}</span>
          {displayRoles(post.authorRole).map((r) => (
            <RoleBadge key={r} role={r} size="sm" />
          ))}
          {post.isNewcomer && <NewcomerBadge size="sm" />}
          {/* 시간·수정됨은 한 덩어리로 — 절대 문구 중간에서 끊기지 않게 */}
          <span className="shrink-0 whitespace-nowrap text-xs text-ink-faint">
            · {timeAgo(post.createdAt)}
          </span>
          {isEdited(post.createdAt, post.updatedAt) && (
            <span className="shrink-0 whitespace-nowrap text-xs text-ink-faint">· 수정됨</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {hasMoreActions && (
            <div className="relative" ref={moreRef}>
              <button
                type="button"
                onClick={() => setMoreOpen((o) => !o)}
                aria-label="더보기"
                aria-haspopup="true"
                aria-expanded={moreOpen}
                className="flex h-6 w-6 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-white/70 hover:text-ink"
              >
                ⋯
              </button>
              {moreOpen && (
                <div
                  className="glass-card absolute right-0 top-[calc(100%+0.25rem)] z-10 w-40 overflow-hidden p-1.5"
                  style={{ background: "rgba(255,255,255,.96)" }}
                >
                  {canMarkAnswered && (
                    <button
                      onClick={() => { setMoreOpen(false); setAnswering(true); setAnswerNote(""); }}
                      className="flex w-full items-center rounded-lg px-3 py-2 text-left text-xs text-teal-ink hover:bg-teal/10"
                    >
                      🌿 응답됨 표시
                    </button>
                  )}
                  {post.canEdit && !editing && (
                    <button
                      onClick={() => { setMoreOpen(false); setEditContent(post.content); setEditImages(post.images); setEditing(true); }}
                      className="flex w-full items-center rounded-lg px-3 py-2 text-left text-xs text-ink-soft hover:bg-white/80 hover:text-ink"
                    >
                      ✏️ 수정
                    </button>
                  )}
                  {canReport && (
                    <button
                      onClick={() => { setMoreOpen(false); setReportOpen(true); }}
                      className="flex w-full items-center rounded-lg px-3 py-2 text-left text-xs text-ink-soft hover:bg-white/80 hover:text-ink"
                    >
                      🚨 신고
                    </button>
                  )}
                  {post.canDelete && (
                    <button
                      onClick={() => { setMoreOpen(false); setConfirmDelete(true); }}
                      className="flex w-full items-center rounded-lg px-3 py-2 text-left text-xs text-red-500 hover:bg-red-50"
                    >
                      🗑 삭제
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
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
      {!editing && (
        <ImageCarousel
          images={post.images}
          onOpen={setLightboxIndex}
          iReacted={post.iReacted}
          onDoubleTapLike={() => onReact(post)}
        />
      )}

      {/* 동아리 광고 — 첨부된 동아리 미리보기 카드 */}
      {!editing && post.club && <ClubAdCard club={post.club} />}

      {/* 응답됨 표시 — 헤더 줄(작성자·시간·수정됨)과 겹쳐 깨지는 걸 피하려 카드 하단으로 이동 */}
      {isPrayer && post.isAnswered && (
        <div className="mt-2.5">
          <span className="inline-block rounded-full border border-teal/35 bg-teal/10 px-2.5 py-0.5 text-xs font-medium text-teal-ink">
            응답됨 🌿
          </span>
          {post.answeredNote && (
            <p className="mt-1.5 rounded-xl border border-teal/25 bg-teal/[0.07] px-3 py-2 text-xs leading-relaxed text-teal-ink">
              🌿 {post.answeredNote}
            </p>
          )}
        </div>
      )}

      {/* 액션 바 — 상시 노출은 공감·댓글만. 수정/신고/삭제/응답표시는 위 ⋯ 메뉴로 이동. */}
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={() => onReact(post)}
          disabled={!loggedIn}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all disabled:opacity-40 ${
            post.iReacted
              ? isPrayer
                ? "border border-gold/45 bg-gold/15 text-gold-ink"
                : isWelcome
                  ? "border border-gold/45 bg-gold/15 text-gold-ink"
                  : "border border-rose-300/60 bg-rose-50 text-rose-500"
              : "glass-soft text-ink-soft hover:bg-white/90 hover:text-ink"
          }`}
        >
          {isPrayer ? (
            <>🙏 {post.iReacted ? "기도했어요" : "기도할게요"}</>
          ) : isWelcome ? (
            <>👋 환영해요</>
          ) : (
            <>{post.iReacted ? "❤️" : "🤍"} 공감</>
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

      {/* 삭제 확인 — ⋯ 메뉴의 '삭제'로 진입 */}
      {confirmDelete && (
        <div className="mt-2 flex items-center justify-end gap-1.5 text-xs">
          <span className="text-ink-soft">삭제할까요?</span>
          <button onClick={() => onDelete(post)} className="font-medium text-red-500 hover:text-red-400">
            예
          </button>
          <button onClick={() => setConfirmDelete(false)} className="text-ink-faint hover:text-ink">
            취소
          </button>
        </div>
      )}

      {/* 신고 — ⋯ 메뉴의 '신고'로 진입 */}
      {reportOpen && (
        <div className="mt-2">
          <ReportButton
            targetType="prayer"
            targetId={post.id}
            forceOpen
            onClose={() => setReportOpen(false)}
          />
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
