"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ApiError, fetchJson } from "@/lib/http";
import { RoleBadge } from "@/components/RoleBadge";
import { displayRoles, type Role } from "@/lib/roles";

type PrayerItem = {
  id: string;
  content: string;
  scope: string;
  isAnswered: boolean;
  answeredNote: string | null;
  answeredAt: string | null;
  createdAt: string;
  isMine: boolean;
  authorName: string;
  authorAvatar: string | null;
  authorRole: Role | null;
  prayCount: number;
  iPrayed: boolean;
};

type ListResponse = {
  ok: true;
  items: PrayerItem[];
  myGroup: "러비아" | "유디코" | null;
  needNickname: boolean;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

export default function PrayerPage() {
  const [tab, setTab] = useState<"all" | "group">("all");
  const [items, setItems] = useState<PrayerItem[]>([]);
  const [myGroup, setMyGroup] = useState<"러비아" | "유디코" | null>(null);
  const [needNickname, setNeedNickname] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  // 작성 폼
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needJoin, setNeedJoin] = useState(false);

  // 인라인 응답 표시 / 삭제 확인
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerNote, setAnswerNote] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setLoggedIn(!!user));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJson<ListResponse>(`/api/prayers?tab=${tab}`);
      setItems(data.items ?? []);
      setMyGroup(data.myGroup);
      setNeedNickname(data.needNickname);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || posting) return;
    setPosting(true);
    setError(null);
    setNeedJoin(false);
    try {
      await fetchJson("/api/prayers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          scope: tab === "group" ? myGroup : "ALL",
          isAnonymous,
        }),
      });
      setContent("");
      setIsAnonymous(false);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.code === "membership_required") setNeedJoin(true);
      setError(err instanceof Error ? err.message : "올리지 못했어요. 다시 시도해주세요.");
    }
    setPosting(false);
  }

  /** 게이트(미승인) 등 API 에러를 작성 폼 영역에 안내 */
  function surfaceApiError(err: unknown, fallback: string) {
    if (err instanceof ApiError && err.code === "membership_required") {
      setNeedJoin(true);
      setError(err.message);
    } else {
      setError(err instanceof Error ? err.message : fallback);
    }
  }

  async function togglePray(p: PrayerItem) {
    // 낙관적 업데이트
    setItems((prev) =>
      prev.map((x) =>
        x.id === p.id
          ? { ...x, iPrayed: !x.iPrayed, prayCount: x.prayCount + (x.iPrayed ? -1 : 1) }
          : x,
      ),
    );
    try {
      const data = await fetchJson<{ ok: true; iPrayed: boolean; prayCount: number }>(
        `/api/prayers/${p.id}/pray`,
        { method: "POST" },
      );
      // 서버 응답 기준으로 보정 (드리프트 방지)
      setItems((prev) =>
        prev.map((x) =>
          x.id === p.id ? { ...x, iPrayed: data.iPrayed, prayCount: data.prayCount } : x,
        ),
      );
    } catch (err) {
      await load(); // 낙관적 업데이트 원복
      surfaceApiError(err, "잠시 후 다시 시도해주세요.");
    }
  }

  async function markAnswered(p: PrayerItem, note: string) {
    try {
      await fetchJson(`/api/prayers/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAnswered: true, answeredNote: note.trim() || undefined }),
      });
      setAnsweringId(null);
      setAnswerNote("");
      await load();
    } catch (err) {
      setAnsweringId(null);
      surfaceApiError(err, "응답 표시에 실패했어요. 다시 시도해주세요.");
    }
  }

  async function remove(p: PrayerItem) {
    await fetch(`/api/prayers/${p.id}`, { method: "DELETE" });
    setDeletingId(null);
    load();
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <main className="relative mx-auto max-w-2xl px-4 py-10">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ink">🙏 기도 광장</h1>
          <p className="mt-1 text-sm text-ink-soft">서로의 기도제목을 나누고, 함께 기도해요.</p>
        </div>

        {/* 탭 */}
        <div className="mb-5 flex gap-2">
          <button
            onClick={() => setTab("all")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              tab === "all" ? "bg-skyx/25 text-skyx-ink ring-1 ring-skyx/40" : "glass-soft text-ink-soft hover:bg-white/90 hover:text-ink"
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setTab("group")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              tab === "group" ? "bg-skyx/25 text-skyx-ink ring-1 ring-skyx/40" : "glass-soft text-ink-soft hover:bg-white/90 hover:text-ink"
            }`}
          >
            {myGroup ? `우리 ${myGroup}` : "우리 집단"}
          </button>
        </div>

        {/* 작성 폼 */}
        {loggedIn ? (
          tab === "group" && needNickname ? (
            <div className="mb-6 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3.5 text-sm text-gold-ink">
              집단 기도는 청년부 가입 승인 후 함께할 수 있어요.{" "}
              <Link href="/join" className="font-semibold underline">가입 신청하기 →</Link>
            </div>
          ) : (
            <form onSubmit={handlePost} className="glass-card mb-6 p-4">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder={tab === "group" ? `우리 ${myGroup}와 나눌 기도제목...` : "전체와 나눌 기도제목..."}
                className="w-full resize-none rounded-xl border border-white/95 bg-white/70 px-4 py-3 text-sm leading-relaxed text-ink placeholder:text-ink-faint focus:border-teal focus:outline-none"
              />
              <div className="mt-3 flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-soft">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="h-4 w-4 rounded border-sky-line bg-white/70 accent-teal"
                  />
                  익명으로 올리기
                </label>
                <button
                  type="submit"
                  disabled={!content.trim() || posting}
                  className="btn-gold rounded-xl px-5 py-2 text-sm"
                >
                  {posting ? "올리는 중..." : "기도제목 올리기"}
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
          )
        ) : (
          <div className="glass-card mb-6 p-5 text-center">
            <p className="mb-3 text-sm text-ink-soft">기도제목을 나누려면 로그인이 필요해요.</p>
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
            <div className="mb-3 text-4xl">🙏</div>
            <p className="text-sm text-ink-soft">아직 나눈 기도제목이 없어요. 첫 기도제목을 올려보세요.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((p) => (
              <li
                key={p.id}
                className={`glass-card p-5 transition-all ${p.isAnswered ? "border-teal/45!" : ""}`}
              >
                {/* 작성자 + 시간 */}
                <div className="mb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {p.authorAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.authorAvatar} alt="" className="h-6 w-6 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-skyx/25 text-xs text-skyx-ink">
                        {p.authorName[0]}
                      </div>
                    )}
                    <span className="text-xs text-ink-soft">{p.authorName}</span>
                    {displayRoles(p.authorRole).map((r) => (
                      <RoleBadge key={r} role={r} size="sm" />
                    ))}
                    <span className="text-xs text-ink-faint">· {timeAgo(p.createdAt)}</span>
                  </div>
                  {p.isAnswered && (
                    <span className="rounded-full border border-teal/35 bg-teal/10 px-2.5 py-0.5 text-xs font-medium text-teal-ink">
                      응답됨 🌿
                    </span>
                  )}
                </div>

                {/* 내용 */}
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{p.content}</p>

                {/* 응답 간증 */}
                {p.isAnswered && p.answeredNote && (
                  <p className="mt-2 rounded-xl border border-teal/25 bg-teal/[0.07] px-3 py-2 text-xs leading-relaxed text-teal-ink">
                    🌿 {p.answeredNote}
                  </p>
                )}

                {/* 액션 */}
                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={() => togglePray(p)}
                    disabled={!loggedIn}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all disabled:opacity-40 ${
                      p.iPrayed
                        ? "border border-gold/45 bg-gold/15 text-gold-ink"
                        : "glass-soft text-ink-soft hover:bg-white/90 hover:text-ink"
                    }`}
                  >
                    🙏 {p.iPrayed ? "기도했어요" : "기도할게요"}
                    {p.prayCount > 0 && <span className="text-ink-faint">· {p.prayCount}</span>}
                  </button>

                  {p.isMine && (
                    <div className="flex items-center gap-2 text-xs">
                      {!p.isAnswered && (
                        <button
                          onClick={() => { setAnsweringId(p.id); setAnswerNote(""); }}
                          className="text-teal-ink hover:text-teal-deep"
                        >
                          응답됨 표시
                        </button>
                      )}
                      {deletingId === p.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-ink-soft">삭제할까요?</span>
                          <button onClick={() => remove(p)} className="font-medium text-red-500 hover:text-red-400">예</button>
                          <button onClick={() => setDeletingId(null)} className="text-ink-faint hover:text-ink">취소</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeletingId(p.id)} className="text-ink-faint hover:text-red-500">
                          삭제
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 응답 간증 인라인 입력 */}
                {answeringId === p.id && (
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
                        onClick={() => markAnswered(p, answerNote)}
                        className="btn-gold flex-1 rounded-xl py-2 text-sm"
                      >
                        응답 표시하기
                      </button>
                      <button
                        onClick={() => { setAnsweringId(null); setAnswerNote(""); }}
                        className="glass-soft rounded-xl px-4 py-2 text-sm text-ink-soft hover:bg-white/90 hover:text-ink"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
