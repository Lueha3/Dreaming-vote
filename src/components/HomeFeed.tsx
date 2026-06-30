"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/time";
import { CLUB_CATEGORY_META } from "@/lib/clubCategories";
import type { FeedData } from "@/lib/feed";

type Feed = FeedData;

// 홈 본문 상태: 로딩 → (비로그인 | 가입유도 | 승인대기 | 승인멤버 피드)
// page.tsx(서버)가 이 View를 직접 계산해 initial prop으로 주입한다(클라 페치 워터폴 제거).
export type HomeView =
  | { kind: "loading" }
  | { kind: "loggedOut" }
  | { kind: "apply" } // 미가입(none) · 반려(rejected)
  | { kind: "pending" }
  | { kind: "approved"; feed: Feed };

const PLAZA_EMOJI: Record<string, string> = {
  일상: "☀️",
  기도해주세요: "🙏",
  동아리광고: "📣",
};

function plazaLink(category: string, id: string): string {
  return `/prayer?category=${encodeURIComponent(category)}#${id}`;
}

function fmtMeeting(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * 홈 본문 — '오늘의 청년부' 피드 우선 화면의 동적 영역.
 * 홈(/)을 정적으로 유지하기 위해 클라에서 쿠키 확인 후 /api/feed를 페치하고,
 * 게이트 상태(비로그인/미가입/대기/승인)별로 안내 또는 활동 피드를 렌더한다.
 *   - 비로그인(쿠키 없음/401)           → 로그인·가입 유도 카드
 *   - 미가입·반려(403 membership_required) → 가입 신청 유도 카드
 *   - 승인 대기(403, status=pending)      → 대기 안내 카드
 *   - 승인 멤버(200)                      → (성향카드 미작성 시) 만들기 CTA + 활동 피드
 */
export function HomeFeed({ initial }: { initial?: HomeView }) {
  const [view, setView] = useState<HomeView>(initial ?? { kind: "loading" });

  useEffect(() => {
    // 서버(page.tsx)가 초기 뷰를 주입했으면 클라 페치를 생략 — 하이드레이션 후 재페치 워터폴 제거.
    if (initial && initial.kind !== "loading") return;

    // 인증 쿠키가 없으면 비로그인 — 서버 왕복 없이 즉시 확정.
    if (!/sb-[a-z0-9-]+-auth-token/i.test(document.cookie)) {
      setView({ kind: "loggedOut" });
      return;
    }

    let alive = true;
    fetch("/api/feed", { cache: "no-store" })
      .then(async (r) => {
        if (!alive) return;
        if (r.ok) {
          const j = await r.json().catch(() => null);
          if (j?.ok) setView({ kind: "approved", feed: j as Feed });
          else setView({ kind: "loggedOut" });
          return;
        }
        if (r.status === 403) {
          // membershipGate가 membershipStatus를 함께 내려준다(none/pending/rejected).
          const j = await r.json().catch(() => null);
          setView({ kind: j?.membershipStatus === "pending" ? "pending" : "apply" });
          return;
        }
        // 401 등(토큰 만료 포함) — 비로그인 취급.
        setView({ kind: "loggedOut" });
      })
      .catch(() => {
        if (alive) setView({ kind: "loggedOut" });
      });
    return () => {
      alive = false;
    };
  }, [initial]);

  if (view.kind === "loading") return null;
  // 1) 비로그인 — 기존과 동일하게 로그인·가입 유도 카드.
  if (view.kind === "loggedOut") return <WelcomeCard />;
  // 2) 로그인했지만 미승인(미가입·반려·승인대기) — 피드를 블러(블라인드)로 가리고 안내 문구 노출.
  if (view.kind === "apply") return <BlindFeed variant="apply" />;
  if (view.kind === "pending") return <BlindFeed variant="pending" />;

  // 승인 멤버
  const { upcomingMeetings, recentClubs, recentPosts, answeredPrayers, hasPersonalityReport } =
    view.feed;
  const feedEmpty =
    !upcomingMeetings.length &&
    !recentClubs.length &&
    !recentPosts.length &&
    !answeredPrayers.length;

  return (
    <div className="mt-8 space-y-3">
      {/* 3) 승인 멤버 — 최신 활동 피드를 상단에 우선 노출(인스타·스레드형). */}

      {/* 다가오는 내 동아리 모임 */}
      {upcomingMeetings.length > 0 && (
        <div className="glass-card p-4">
          <p className="mb-2.5 text-xs font-semibold text-teal-ink">📅 다가오는 모임</p>
          <ul className="space-y-2">
            {upcomingMeetings.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/clubs/${m.clubId}/meetings/${m.id}`}
                  className="block rounded-xl border border-white/90 bg-white/55 px-3 py-2.5 transition-all hover:bg-white/80"
                >
                  <p className="text-sm font-semibold text-ink">{m.title}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {m.clubName} · {fmtMeeting(m.meetsAt)}
                    {m.place ? ` · ${m.place}` : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 새로 생긴 동아리 */}
      {recentClubs.length > 0 && (
        <div className="glass-card p-4">
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-xs font-semibold text-skyx-ink">✨ 새로 생긴 동아리</p>
            <Link href="/clubs" className="text-xs text-ink-faint hover:text-skyx-ink">
              전체 보기 →
            </Link>
          </div>
          <ul className="space-y-1.5">
            {recentClubs.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/clubs/${c.id}`}
                  className="flex items-center gap-2 rounded-xl border border-white/90 bg-white/55 px-3 py-2 transition-all hover:bg-white/80"
                >
                  <span aria-hidden>{CLUB_CATEGORY_META[c.category]?.emoji ?? "✨"}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{c.name}</span>
                  <span className="shrink-0 text-xs text-ink-faint">멤버 {c.memberCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 광장 소식 */}
      {recentPosts.length > 0 && (
        <div className="glass-card p-4">
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-xs font-semibold text-gold-ink">🗣 광장 소식</p>
            <Link href="/prayer" className="text-xs text-ink-faint hover:text-skyx-ink">
              광장 가기 →
            </Link>
          </div>
          <ul className="space-y-1.5">
            {recentPosts.map((p) => (
              <li key={p.id}>
                <Link
                  href={plazaLink(p.category, p.id)}
                  className="block rounded-xl border border-white/90 bg-white/55 px-3 py-2 transition-all hover:bg-white/80"
                >
                  <p className="truncate text-sm text-ink">
                    <span className="mr-1" aria-hidden>
                      {PLAZA_EMOJI[p.category] ?? "💬"}
                    </span>
                    {p.snippet}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {p.authorName} · {timeAgo(p.createdAt)}
                    {p.reactionCount > 0 ? ` · 💙 ${p.reactionCount}` : ""}
                    {p.commentCount > 0 ? ` · 💬 ${p.commentCount}` : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 응답된 기도 */}
      {answeredPrayers.length > 0 && (
        <div className="glass-card p-4">
          <p className="mb-2.5 text-xs font-semibold text-teal-ink">🌿 응답된 기도</p>
          <ul className="space-y-1.5">
            {answeredPrayers.map((p) => (
              <li key={p.id}>
                <Link
                  href={plazaLink(p.category, p.id)}
                  className="block rounded-xl border border-teal/25 bg-teal/[0.06] px-3 py-2 transition-all hover:bg-teal/[0.12]"
                >
                  <p className="truncate text-sm text-ink">{p.snippet}</p>
                  {p.answeredNote && (
                    <p className="mt-0.5 truncate text-xs text-teal-ink">🌿 {p.answeredNote}</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 성향 카드 미작성 멤버 — 다음 스텝 유도(피드 아래). 피드가 비어도 이 카드가 채워준다. */}
      {!hasPersonalityReport && <CreateCardCTA />}

      {/* 승인 멤버 + 성향카드 보유 + 피드 비었을 때의 부드러운 빈 상태 */}
      {feedEmpty && hasPersonalityReport && <EmptyFeed />}
    </div>
  );
}

/* ── 게이트 상태별 안내 카드 ─────────────────────────────────────────────── */

// 승인 직후 '다음 스텝' 유도 — 성향 카드 만들기.
function CreateCardCTA() {
  return (
    <div className="glass-card glass-ribbon card-glow relative overflow-hidden px-6 py-7 text-center">
      <div className="mb-2 text-3xl" aria-hidden>
        🎉
      </div>
      <p className="mb-1 text-base font-bold text-ink">가입을 환영해요!</p>
      <p className="mb-5 text-sm leading-relaxed text-ink-soft">
        이제 성격유형을 골라 나에게 꼭 맞는 동아리를 찾아보세요.
      </p>
      <Link
        href="/start"
        className="btn-gold btn-glow inline-block rounded-full px-6 py-3 text-sm font-bold"
      >
        🧭 성격유형 고르기 →
      </Link>
    </div>
  );
}

// 비로그인 — 로그인/가입 유도.
function WelcomeCard() {
  return (
    <div className="glass-card mt-8 px-6 py-8 text-center">
      <div className="mb-3 text-3xl" aria-hidden>
        ⛪
      </div>
      <p className="mb-1.5 text-base font-bold text-ink">우리 청년부 소식을 받아보세요</p>
      <p className="mb-6 text-sm leading-relaxed text-ink-soft">
        새로 생긴 동아리, 모임, 광장 이야기가 여기 모여요.
        <br />
        로그인하고 함께해요!
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/login"
          className="glass-soft rounded-full px-5 py-2.5 text-sm font-semibold text-skyx-ink"
        >
          로그인
        </Link>
        {/* 비로그인 상태 — 가입 신청도 구글 로그인이 선행조건이므로 /login을 거쳐
            로그인 완료 후 /join 폼으로 돌아온다(next). 로그인 유저용 BlindFeed의 버튼은 /join 직행. */}
        <Link
          href="/login?next=/join"
          className="btn-gold rounded-full px-5 py-2.5 text-sm font-bold"
        >
          가입 신청하기 →
        </Link>
      </div>
    </div>
  );
}

/**
 * 미승인(미가입·반려·승인대기) 로그인 유저용 '블라인드 피드'.
 * 실제 피드 데이터는 게이트로 막혀 받지 못하므로, 더미 카드를 블러 처리해
 * "여기 소식이 모인다"는 미리보기만 보여주고 그 위에 상태별 안내를 띄운다.
 *   - pending : "가입 승인 대기중!" (이미 신청, 승인 대기)
 *   - apply   : 미가입·반려 — 가입 신청 버튼을 함께 노출
 */
function BlindFeed({ variant }: { variant: "pending" | "apply" }) {
  return (
    <div className="relative mt-8">
      {/* 블러 처리된 더미 피드 — 읽을 수 없게 가린 미리보기(접근성/포커스에서 제외) */}
      <div
        aria-hidden
        className="space-y-3 select-none blur-[6px] pointer-events-none"
      >
        <FeedSkeletonCard accent="teal" lines={2} />
        <FeedSkeletonCard accent="sky" lines={1} />
        <FeedSkeletonCard accent="gold" lines={2} />
      </div>

      {/* 안내 오버레이 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <div className="mb-3 text-4xl" aria-hidden>
          {variant === "pending" ? "⏳" : "✋"}
        </div>
        {variant === "pending" ? (
          <>
            <p className="mb-1.5 text-xl font-extrabold text-ink">가입 승인 대기중!</p>
            <p className="text-sm leading-relaxed text-ink-soft">
              운영진의 승인을 기다리는 중이에요.
              <br />
              승인되면 청년부 소식을 모두 볼 수 있어요.
            </p>
          </>
        ) : (
          <>
            <p className="mb-1.5 text-xl font-extrabold text-ink">청년부 가입하고 함께해요</p>
            <p className="mb-5 text-sm leading-relaxed text-ink-soft">
              가입 승인 후 청년부 소식과 모임을 모두 볼 수 있어요.
            </p>
            <Link
              href="/join"
              className="btn-gold btn-glow inline-block rounded-full px-6 py-3 text-sm font-bold"
            >
              가입 신청하기 →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

// 블라인드 피드용 더미 카드 — 실제 콘텐츠 대신 모양만 흉내내 블러로 가린다.
function FeedSkeletonCard({
  accent,
  lines,
}: {
  accent: "teal" | "sky" | "gold";
  lines: number;
}) {
  const dot =
    accent === "teal" ? "bg-teal/60" : accent === "sky" ? "bg-skyx/60" : "bg-gold-deep/60";
  return (
    <div className="glass-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
        <span className="h-3 w-24 rounded-full bg-ink/15" />
      </div>
      <div className="space-y-2">
        <span className="block h-3.5 w-full rounded-full bg-ink/10" />
        {Array.from({ length: lines }).map((_, i) => (
          <span key={i} className="block h-3.5 w-4/5 rounded-full bg-ink/10" />
        ))}
      </div>
    </div>
  );
}

// 승인 멤버지만 아직 피드에 보여줄 소식이 없을 때.
function EmptyFeed() {
  return (
    <div className="glass-card px-6 py-8 text-center">
      <p className="mb-4 text-sm leading-relaxed text-ink-soft">
        아직 새로운 소식이 없어요.
        <br />
        동아리를 둘러보며 첫 활동을 시작해볼까요?
      </p>
      <Link
        href="/clubs"
        className="glass-soft inline-block rounded-full px-5 py-2.5 text-sm font-semibold text-skyx-ink"
      >
        동아리 둘러보기 →
      </Link>
    </div>
  );
}
