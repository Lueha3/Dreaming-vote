"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchJson } from "@/lib/http";
import { PlazaImageUploader } from "./PlazaImageUploader";
import { PlazaPostCard } from "./PlazaPostCard";
import { CATEGORIES, CATEGORY_META, type Category, type PlazaPost } from "./types";

type ListResponse = { ok: true; items: PlazaPost[]; loggedIn: boolean };

export default function PlazaPage() {
  const [category, setCategory] = useState<Category>("일상");
  const [items, setItems] = useState<PlazaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  // 작성 폼
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploaderKey, setUploaderKey] = useState(0);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needJoin, setNeedJoin] = useState(false);

  const isPrayer = category === "기도해주세요";

  // 카테고리 전환 시 작성 폼의 카테고리-종속 상태(이미지·익명)는 초기화한다(내용은 유지).
  function switchCategory(c: Category) {
    if (c === category) return;
    setCategory(c);
    setImages([]);
    setIsAnonymous(false);
    setUploadingImages(false);
    setUploaderKey((k) => k + 1);
    setError(null);
    setNeedJoin(false);
  }

  // 목록 페치 실패에도 로그인 UI가 어긋나지 않도록 쿠키로 초기 힌트만 시드(서버가 최종 집행).
  useEffect(() => {
    if (/sb-[a-z0-9-]+-auth-token/i.test(document.cookie)) setLoggedIn(true);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJson<ListResponse>(`/api/prayers?category=${encodeURIComponent(category)}`);
      setItems(data.items ?? []);
      setLoggedIn(data.loggedIn);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, [category]);

  useEffect(() => {
    load();
  }, [load]);

  /** 게이트(미승인) 등 API 에러를 작성 폼 영역에 안내 */
  function surfaceApiError(err: unknown, fallback: string) {
    if (err instanceof ApiError && err.code === "membership_required") {
      setNeedJoin(true);
      setError(err.message);
    } else {
      setError(err instanceof Error ? err.message : fallback);
    }
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if ((!text && images.length === 0) || posting) return;
    setPosting(true);
    setError(null);
    setNeedJoin(false);
    try {
      await fetchJson("/api/prayers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          content: text,
          isAnonymous: isPrayer ? isAnonymous : false,
          images,
        }),
      });
      setContent("");
      setIsAnonymous(false);
      setImages([]);
      setUploaderKey((k) => k + 1); // 업로더 리셋
      await load();
    } catch (err) {
      surfaceApiError(err, "올리지 못했어요. 다시 시도해주세요.");
    }
    setPosting(false);
  }

  async function react(post: PlazaPost) {
    // 낙관적 토글
    setItems((prev) =>
      prev.map((x) =>
        x.id === post.id
          ? { ...x, iReacted: !x.iReacted, reactionCount: x.reactionCount + (x.iReacted ? -1 : 1) }
          : x,
      ),
    );
    try {
      const data = await fetchJson<{ ok: true; iReacted: boolean; reactionCount: number }>(
        `/api/prayers/${post.id}/pray`,
        { method: "POST" },
      );
      setItems((prev) =>
        prev.map((x) =>
          x.id === post.id ? { ...x, iReacted: data.iReacted, reactionCount: data.reactionCount } : x,
        ),
      );
    } catch (err) {
      await load(); // 원복
      surfaceApiError(err, "잠시 후 다시 시도해주세요.");
    }
  }

  async function removePost(post: PlazaPost) {
    setItems((prev) => prev.filter((x) => x.id !== post.id));
    try {
      await fetchJson(`/api/prayers/${post.id}`, { method: "DELETE" });
    } catch {
      await load(); // 실패 시 원복
    }
  }

  async function markAnswered(post: PlazaPost, note: string) {
    try {
      await fetchJson(`/api/prayers/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAnswered: true, answeredNote: note.trim() || undefined }),
      });
      await load();
    } catch (err) {
      surfaceApiError(err, "응답 표시에 실패했어요. 다시 시도해주세요.");
    }
  }

  function commentDelta(postId: string, delta: number) {
    setItems((prev) =>
      prev.map((x) => (x.id === postId ? { ...x, commentCount: Math.max(0, x.commentCount + delta) } : x)),
    );
  }

  const meta = CATEGORY_META[category];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <main className="relative mx-auto max-w-2xl px-4 py-10">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ink">🗣 광장</h1>
          <p className="mt-1 text-sm text-ink-soft">일상을 나누고, 기도제목을 올리고, 동아리를 알려요.</p>
        </div>

        {/* 카테고리 탭 */}
        <div className="mb-5 flex gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => switchCategory(c)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                category === c
                  ? "bg-skyx/25 text-skyx-ink ring-1 ring-skyx/40"
                  : "glass-soft text-ink-soft hover:bg-white/90 hover:text-ink"
              }`}
            >
              {CATEGORY_META[c].emoji} {c}
            </button>
          ))}
        </div>

        {/* 작성 폼 */}
        {loggedIn ? (
          <form onSubmit={handlePost} className="glass-card mb-6 p-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder={meta.placeholder}
              className="w-full resize-none rounded-xl border border-white/95 bg-white/70 px-4 py-3 text-sm leading-relaxed text-ink placeholder:text-ink-faint focus:border-teal focus:outline-none"
            />

            {/* 이미지 업로더 */}
            <div className="mt-3">
              <PlazaImageUploader
                key={uploaderKey}
                onChange={setImages}
                onUploadingChange={setUploadingImages}
                maxImages={3}
              />
            </div>

            <div className="mt-3 flex items-center justify-between">
              {isPrayer ? (
                <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-soft">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="h-4 w-4 rounded border-sky-line bg-white/70 accent-teal"
                  />
                  익명으로 올리기
                </label>
              ) : (
                <span className="text-xs text-ink-faint">사진은 최대 3장 · 자동 압축돼요</span>
              )}
              <button
                type="submit"
                disabled={(!content.trim() && images.length === 0) || posting || uploadingImages}
                className="btn-gold rounded-xl px-5 py-2 text-sm disabled:opacity-40"
              >
                {uploadingImages ? "사진 올리는 중..." : posting ? "올리는 중..." : "올리기"}
              </button>
            </div>
            {error && (
              <p className="mt-2 text-xs text-red-500">
                {error}
                {needJoin && (
                  <Link href="/join" className="ml-1.5 font-semibold text-gold-ink underline underline-offset-2">
                    가입 신청하러 가기 →
                  </Link>
                )}
              </p>
            )}
          </form>
        ) : (
          <div className="glass-card mb-6 p-5 text-center">
            <p className="mb-3 text-sm text-ink-soft">글을 나누려면 로그인이 필요해요.</p>
            <Link href="/login?next=/prayer" className="btn-gold inline-block rounded-full px-6 py-2.5 text-sm">
              로그인하기
            </Link>
          </div>
        )}

        {/* 목록 */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-3xl bg-white/55" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="glass-card px-8 py-14 text-center">
            <div className="mb-3 text-4xl">{meta.emoji}</div>
            <p className="text-sm text-ink-soft">{meta.empty}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((post) => (
              <PlazaPostCard
                key={post.id}
                post={post}
                loggedIn={loggedIn}
                onReact={react}
                onDelete={removePost}
                onAnswered={markAnswered}
                onCommentDelta={commentDelta}
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
