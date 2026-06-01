"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ReportItem = {
  shareSlug: string;
  catchphrase: string;
  coreTraits: string;
  sourceAi: string;
  viewCount: number;
  createdAt: string;
  isPublic: boolean;
};

const SOURCE_LABEL: Record<string, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  personality: "성격유형",
  other: "AI",
};

export default function MyPage() {
  const [items, setItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [notLoggedIn, setNotLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setNotLoggedIn(true);
        setLoading(false);
        return;
      }

      setNickname(user.user_metadata?.full_name ?? null);
      setAvatarUrl(user.user_metadata?.avatar_url ?? null);

      fetch("/api/reports/me")
        .then((res) => res.json())
        .then((data) => {
          if (data.ok) setItems(data.items ?? []);
          else setNotLoggedIn(true);
        })
        .catch(() => setNotLoggedIn(true))
        .finally(() => setLoading(false));
    });
  }, []);

  /* ── 로딩 ─────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="relative min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
        <AmbientGlow />
        <main className="relative mx-auto max-w-2xl px-4 py-14">
          <SkeletonList />
        </main>
      </div>
    );
  }

  /* ── 비로그인 ─────────────────────────────────────────────── */
  if (notLoggedIn) {
    return (
      <div className="relative min-h-screen bg-[#0a0a0a] text-white overflow-hidden flex items-center justify-center">
        <AmbientGlow />
        <div className="relative text-center px-6">
          <div className="mb-6 text-5xl">🔐</div>
          <h2 className="mb-3 text-2xl font-bold text-white">로그인이 필요합니다</h2>
          <p className="mb-8 text-sm text-zinc-500 leading-relaxed">
            내 리포트를 보려면 로그인을 해주세요.
          </p>
          <Link
            href="/login?next=/my"
            className="inline-block rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 btn-glow"
          >
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  /* ── 메인 ─────────────────────────────────────────────────── */
  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      <AmbientGlow />

      <main className="relative mx-auto max-w-2xl px-4 py-14">
        {/* 닉네임 미설정 배너 — nickname이 null이거나 형식 불일치 시 표시 */}
        {(!nickname || !/^(러비아|유디코)-\d{2}-.+$/.test(nickname)) && (
          <Link
            href="/my/profile"
            className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.08] px-4 py-3.5 transition-all hover:border-amber-500/50"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-lg">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-amber-300">닉네임을 설정해주세요</p>
                <p className="text-xs text-amber-400/70">집단-나이-이름 형식 필요 · 동아리 참여 전 필수</p>
              </div>
            </div>
            <span className="shrink-0 text-xs text-amber-400">설정하기 →</span>
          </Link>
        )}

        {/* 프로필 헤더 */}
        <div className="mb-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt="프로필"
                  className="h-10 w-10 rounded-full object-cover ring-2 ring-violet-500/20"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/20 text-lg ring-2 ring-violet-500/20">
                  👤
                </div>
              )}
              <div>
                <p className="font-semibold text-white">{nickname ?? "나"}</p>
                <p className="text-xs text-zinc-500">리포트 {items.length}개</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/my/profile"
                className="rounded-full border border-white/[0.07] bg-white/[0.04] px-3 py-2 text-xs text-zinc-400 transition-all hover:border-white/20 hover:text-zinc-200"
              >
                닉네임 변경
              </Link>
              <Link
                href="/"
                className="rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 btn-glow"
              >
                + 새 리포트
              </Link>
            </div>
          </div>
        </div>

        {/* 타이틀 */}
        <h1 className="mb-6 text-2xl font-bold text-white">내 리포트</h1>

        {/* 리스트 */}
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <ReportListItem
                key={item.shareSlug}
                item={item}
                onVisibilityChange={(slug, isPublic) =>
                  setItems((prev) => prev.map((r) => r.shareSlug === slug ? { ...r, isPublic } : r))
                }
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

/* ── 서브 컴포넌트 ─────────────────────────────────────────────── */

function AmbientGlow() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full bg-violet-600/8 blur-[120px]" />
      <div className="absolute top-1/2 -left-24 w-[300px] h-[300px] rounded-full bg-blue-600/6 blur-[100px]" />
    </div>
  );
}

function ReportListItem({
  item,
  onVisibilityChange,
}: {
  item: ReportItem;
  onVisibilityChange: (slug: string, isPublic: boolean) => void;
}) {
  const [toggling, setToggling] = useState(false);
  const traits = item.coreTraits.split(/[,，、]/).map((t) => t.trim()).filter(Boolean);

  async function toggleVisibility(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setToggling(true);
    const next = !item.isPublic;
    await fetch(`/api/reports/${item.shareSlug}/visibility`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: next }),
    });
    onVisibilityChange(item.shareSlug, next);
    setToggling(false);
  }

  return (
    <li className="rounded-2xl border border-white/[0.07] bg-[#111111] transition-all hover:border-violet-500/20">
      <Link href={`/report/${item.shareSlug}`} className="group block p-5">
        {/* 캐치프레이즈 */}
        <p className="font-semibold text-white transition-colors group-hover:text-violet-200">
          &ldquo;
          <span className="bg-gradient-to-r from-violet-300 to-blue-300 bg-clip-text text-transparent">
            {item.catchphrase}
          </span>
          &rdquo;
        </p>
        {traits.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {traits.map((t, i) => (
              <span key={i} className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-0.5 text-xs text-violet-400">
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-600">
          <span className="rounded-full border border-white/[0.07] bg-white/[0.04] px-2.5 py-0.5 text-zinc-500">
            {SOURCE_LABEL[item.sourceAi] ?? "AI"} 분석
          </span>
          <span>👁 {item.viewCount}</span>
          <span>{new Date(item.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })}</span>
        </div>
      </Link>

      {/* 공개/비공개 토글 */}
      <div className="flex items-center justify-between border-t border-white/[0.05] px-5 py-3">
        <span className="text-xs text-zinc-600">공개 설정</span>
        <button
          onClick={toggleVisibility}
          disabled={toggling}
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50 ${
            item.isPublic
              ? "border border-emerald-500/25 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
              : "border border-white/[0.07] bg-white/[0.04] text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${item.isPublic ? "bg-emerald-400" : "bg-zinc-600"}`} />
          {item.isPublic ? "공개" : "비공개"}
        </button>
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#111111] px-8 py-14 text-center">
      <div className="mb-4 text-4xl">✨</div>
      <p className="mb-2 font-semibold text-zinc-200">아직 리포트가 없어요</p>
      <p className="mb-7 text-sm leading-relaxed text-zinc-500">
        AI와 대화하고 나만의 비즈니스 페르소나를
        <br />
        만들어보세요.
      </p>
      <Link
        href="/"
        className="inline-block rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 btn-glow"
      >
        첫 리포트 만들기 →
      </Link>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-white/[0.07] bg-[#111111] p-5"
        >
          <div className="mb-3 h-5 w-3/4 rounded bg-white/5" />
          <div className="mb-3 flex gap-2">
            <div className="h-5 w-16 rounded-full bg-violet-500/10" />
            <div className="h-5 w-20 rounded-full bg-violet-500/10" />
            <div className="h-5 w-14 rounded-full bg-violet-500/10" />
          </div>
          <div className="flex gap-3">
            <div className="h-3 w-20 rounded bg-white/5" />
            <div className="h-3 w-12 rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
