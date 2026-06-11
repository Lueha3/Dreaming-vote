"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { parseTraits } from "@/lib/bibleArchetypes";
import { NICKNAME_RE } from "@/lib/membership";

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
  // null = 아직 조회 전(배너 미표시) — 깜빡임 방지
  const [membershipStatus, setMembershipStatus] = useState<string | null>(null);

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

      // 활동 닉네임·멤버십 상태는 가입 승인 시 자동 생성되는 Prisma 값이 진실
      fetch("/api/membership", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          if (json?.ok) {
            setMembershipStatus(json.membership.membershipStatus ?? "none");
            const raw = json.membership.nickname ?? null;
            if (raw && NICKNAME_RE.test(raw)) setNickname(raw);
          }
        })
        .catch(() => {});

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
      <div className="relative min-h-screen overflow-hidden">
        <main className="relative mx-auto max-w-2xl px-4 py-14">
          <SkeletonList />
        </main>
      </div>
    );
  }

  /* ── 비로그인 ─────────────────────────────────────────────── */
  if (notLoggedIn) {
    return (
      <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
        <div className="relative text-center px-6">
          <div className="mb-6 text-5xl">🔐</div>
          <h2 className="mb-3 text-2xl font-bold text-ink">로그인이 필요합니다</h2>
          <p className="mb-8 text-sm text-ink-soft leading-relaxed">
            내 성향 카드를 보려면 로그인을 해주세요.
          </p>
          <Link
            href="/login?next=/my"
            className="btn-gold inline-block rounded-full px-6 py-3 text-sm font-semibold btn-glow"
          >
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  /* ── 메인 ─────────────────────────────────────────────────── */
  return (
    <div className="relative min-h-screen overflow-hidden">
      <main className="relative mx-auto max-w-2xl px-4 py-14">
        {/* 멤버십 배너 — 상태 조회 후에만 표시 (깜빡임 방지), 승인되면 숨김 */}
        {membershipStatus && membershipStatus !== "approved" && (
          membershipStatus === "pending" ? (
            <Link
              href="/join"
              className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-skyx/45 bg-skyx/15 px-4 py-3.5 transition-all hover:border-skyx/60"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">⏳</span>
                <div>
                  <p className="text-sm font-semibold text-skyx-ink">가입 승인을 기다리는 중이에요</p>
                  <p className="text-xs text-skyx-ink/70">
                    승인되면 닉네임(집단-나이-이름)이 자동으로 만들어져요
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-xs text-skyx-ink">신청 내용 보기 →</span>
            </Link>
          ) : (
            <Link
              href="/join"
              className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3.5 transition-all hover:border-gold/60"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">⛪</span>
                <div>
                  <p className="text-sm font-semibold text-gold-ink">청년부 가입 신청을 해주세요</p>
                  <p className="text-xs text-gold-ink/70">
                    승인되면 닉네임(집단-나이-이름)이 자동으로 만들어져요 · 동아리 참여 전 필수
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-xs text-gold-ink">신청하기 →</span>
            </Link>
          )
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
                  className="h-10 w-10 rounded-full object-cover ring-2 ring-skyx/30"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-skyx/25 text-lg ring-2 ring-skyx/30">
                  👤
                </div>
              )}
              <div>
                <p className="font-semibold text-ink">{nickname ?? "나"}</p>
                <p className="text-xs text-ink-soft">성향 카드 {items.length}개</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/my/profile"
                className="glass-soft rounded-full px-3 py-2 text-xs text-ink-soft transition-all hover:bg-white/90 hover:text-ink"
              >
                프로필 설정
              </Link>
              <Link
                href="/"
                className="btn-gold rounded-full px-4 py-2 text-xs font-semibold btn-glow"
              >
                + 새 성향 카드
              </Link>
            </div>
          </div>
        </div>

        {/* 타이틀 */}
        <h1 className="mb-6 text-2xl font-bold text-ink">내 성향 카드</h1>

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

function ReportListItem({
  item,
  onVisibilityChange,
}: {
  item: ReportItem;
  onVisibilityChange: (slug: string, isPublic: boolean) => void;
}) {
  const [toggling, setToggling] = useState(false);
  const traits = parseTraits(item.coreTraits);

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
    <li className="glass-card transition-all hover:border-teal/40">
      <Link href={`/report/${item.shareSlug}`} className="group block p-5">
        {/* 캐치프레이즈 */}
        <p className="font-semibold text-ink transition-colors group-hover:text-teal-ink">
          &ldquo;
          <span className="gradient-text">
            {item.catchphrase}
          </span>
          &rdquo;
        </p>
        {traits.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {traits.map(({ token, archetype }, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-full border border-gold/35 bg-gold/10 px-2.5 py-0.5 text-xs text-gold-ink">
                {archetype && <span className="leading-none">{archetype.emoji}</span>}
                {archetype?.label ?? token}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink-faint">
          <span className="glass-soft rounded-full px-2.5 py-0.5 text-ink-soft">
            {SOURCE_LABEL[item.sourceAi] ?? "AI"} 분석
          </span>
          <span>👁 {item.viewCount}</span>
          <span>{new Date(item.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })}</span>
        </div>
      </Link>

      {/* 공개/비공개 토글 */}
      <div className="flex items-center justify-between border-t border-sky-line px-5 py-3">
        <span className="text-xs text-ink-faint">공개 설정</span>
        <button
          onClick={toggleVisibility}
          disabled={toggling}
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50 ${
            item.isPublic
              ? "border border-teal/35 bg-teal/10 text-teal-ink hover:bg-teal/20"
              : "glass-soft text-ink-faint hover:text-ink"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${item.isPublic ? "bg-teal" : "bg-ink-faint"}`} />
          {item.isPublic ? "공개" : "비공개"}
        </button>
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="glass-card px-8 py-14 text-center">
      <div className="mb-4 text-4xl">✨</div>
      <p className="mb-2 font-semibold text-ink">아직 성향 카드가 없어요</p>
      <p className="mb-7 text-sm leading-relaxed text-ink-soft">
        첫 성향 카드를 만들어볼까요?
      </p>
      <Link
        href="/"
        className="btn-gold inline-block rounded-full px-6 py-2.5 text-sm font-semibold btn-glow"
      >
        첫 성향 카드 만들기 →
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
          className="glass-card animate-pulse p-5"
        >
          <div className="mb-3 h-5 w-3/4 rounded bg-white/55" />
          <div className="mb-3 flex gap-2">
            <div className="h-5 w-16 rounded-full bg-gold/15" />
            <div className="h-5 w-20 rounded-full bg-gold/15" />
            <div className="h-5 w-14 rounded-full bg-gold/15" />
          </div>
          <div className="flex gap-3">
            <div className="h-3 w-20 rounded bg-white/55" />
            <div className="h-3 w-12 rounded bg-white/55" />
          </div>
        </div>
      ))}
    </div>
  );
}
