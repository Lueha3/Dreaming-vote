"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchJson } from "@/lib/http";

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
      setError(err instanceof Error ? err.message : "올리기에 실패했습니다.");
    }
    setPosting(false);
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
      await fetch(`/api/prayers/${p.id}/pray`, { method: "POST" });
    } catch {
      load(); // 실패 시 복구
    }
  }

  async function markAnswered(p: PrayerItem) {
    const note = window.prompt("응답 간증 한 줄 (선택, 비워도 됨):", "") ?? "";
    await fetch(`/api/prayers/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAnswered: true, answeredNote: note.trim() || undefined }),
    });
    load();
  }

  async function remove(p: PrayerItem) {
    if (!window.confirm("이 기도제목을 삭제할까요?")) return;
    await fetch(`/api/prayers/${p.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full bg-violet-600/8 blur-[120px]" />
      </div>

      <main className="relative mx-auto max-w-2xl px-4 py-10">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">🙏 기도 광장</h1>
          <p className="mt-1 text-sm text-zinc-500">서로의 기도제목을 나누고, 함께 기도해요.</p>
        </div>

        {/* 탭 */}
        <div className="mb-5 flex gap-2">
          <button
            onClick={() => setTab("all")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              tab === "all" ? "bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/40" : "bg-white/5 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setTab("group")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              tab === "group" ? "bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/40" : "bg-white/5 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {myGroup ? `우리 ${myGroup}` : "우리 집단"}
          </button>
        </div>

        {/* 작성 폼 */}
        {loggedIn ? (
          tab === "group" && needNickname ? (
            <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] px-4 py-3.5 text-sm text-amber-300">
              집단 기도는 닉네임 설정 후 이용할 수 있어요.{" "}
              <Link href="/my/profile" className="font-semibold underline">닉네임 설정하기 →</Link>
            </div>
          ) : (
            <form onSubmit={handlePost} className="mb-6 rounded-2xl border border-white/[0.07] bg-[#111111] p-4">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder={tab === "group" ? `우리 ${myGroup}와 나눌 기도제목...` : "전체와 나눌 기도제목..."}
                className="w-full resize-none rounded-xl border border-white/[0.07] bg-black/30 px-4 py-3 text-sm leading-relaxed text-zinc-200 placeholder-zinc-600 focus:border-violet-500/50 focus:outline-none"
              />
              <div className="mt-3 flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-white/5 accent-violet-500"
                  />
                  익명으로 올리기
                </label>
                <button
                  type="submit"
                  disabled={!content.trim() || posting}
                  className="rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 btn-glow"
                >
                  {posting ? "올리는 중..." : "기도제목 올리기"}
                </button>
              </div>
              {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
            </form>
          )
        ) : (
          <div className="mb-6 rounded-2xl border border-white/[0.07] bg-[#111111] p-5 text-center">
            <p className="mb-3 text-sm text-zinc-400">기도제목을 나누려면 로그인이 필요해요.</p>
            <Link href="/login?next=/prayer" className="inline-block rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white btn-glow">
              로그인하기
            </Link>
          </div>
        )}

        {/* 목록 */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl border border-white/[0.07] bg-[#111111]" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.07] bg-[#111111] px-8 py-14 text-center">
            <div className="mb-3 text-4xl">🙏</div>
            <p className="text-sm text-zinc-400">아직 나눈 기도제목이 없어요. 첫 기도제목을 올려보세요.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((p) => (
              <li
                key={p.id}
                className={`rounded-2xl border bg-[#111111] p-5 transition-all ${
                  p.isAnswered ? "border-emerald-500/25" : "border-white/[0.07]"
                }`}
              >
                {/* 작성자 + 시간 */}
                <div className="mb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {p.authorAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.authorAvatar} alt="" className="h-6 w-6 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/20 text-xs text-violet-300">
                        {p.authorName[0]}
                      </div>
                    )}
                    <span className="text-xs text-zinc-400">{p.authorName}</span>
                    <span className="text-xs text-zinc-600">· {timeAgo(p.createdAt)}</span>
                  </div>
                  {p.isAnswered && (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                      응답됨 🌿
                    </span>
                  )}
                </div>

                {/* 내용 */}
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">{p.content}</p>

                {/* 응답 간증 */}
                {p.isAnswered && p.answeredNote && (
                  <p className="mt-2 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.06] px-3 py-2 text-xs leading-relaxed text-emerald-300/90">
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
                        ? "border border-violet-500/30 bg-violet-500/15 text-violet-300"
                        : "border border-white/[0.07] bg-white/[0.04] text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    🙏 {p.iPrayed ? "기도했어요" : "기도할게요"}
                    {p.prayCount > 0 && <span className="text-zinc-500">· {p.prayCount}</span>}
                  </button>

                  {p.isMine && (
                    <div className="flex items-center gap-2 text-xs">
                      {!p.isAnswered && (
                        <button onClick={() => markAnswered(p)} className="text-emerald-400 hover:text-emerald-300">
                          응답됨 표시
                        </button>
                      )}
                      <button onClick={() => remove(p)} className="text-zinc-600 hover:text-red-400">
                        삭제
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
