"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/time";
import { CLUB_CATEGORY_META } from "@/lib/clubCategories";

type Meeting = {
  id: string;
  clubId: string;
  clubName: string;
  title: string;
  meetsAt: string;
  place: string;
};
type ClubItem = { id: string; name: string; category: string; memberCount: number };
type Post = {
  id: string;
  category: string;
  snippet: string;
  authorName: string;
  createdAt: string;
  reactionCount: number;
  commentCount: number;
};
type Answered = {
  id: string;
  category: string;
  snippet: string;
  answeredNote: string | null;
  createdAt: string | null;
};
type Feed = {
  upcomingMeetings: Meeting[];
  recentClubs: ClubItem[];
  recentPosts: Post[];
  answeredPrayers: Answered[];
};

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
 * 홈 활동 피드 — 로그인 승인 멤버에게만 보이는 '오늘의 청년부'.
 * 홈(/)을 정적으로 유지하기 위해 클라에서 쿠키 확인 후 /api/feed를 페치한다.
 * 비로그인·미승인(403)·빈 피드는 아무 것도 렌더하지 않는다.
 */
export function HomeFeed() {
  const [feed, setFeed] = useState<Feed | null>(null);

  useEffect(() => {
    // 인증 쿠키가 없으면 비로그인 — 서버 왕복 없이 스킵.
    if (!/sb-[a-z0-9-]+-auth-token/i.test(document.cookie)) return;

    let alive = true;
    fetch("/api/feed", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (alive && j?.ok) setFeed(j as Feed);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!feed) return null;
  const { upcomingMeetings, recentClubs, recentPosts, answeredPrayers } = feed;
  if (
    !upcomingMeetings.length &&
    !recentClubs.length &&
    !recentPosts.length &&
    !answeredPrayers.length
  ) {
    return null;
  }

  return (
    <section className="mt-14 space-y-3">
      <h2 className="flex items-center justify-center gap-2 text-sm font-bold text-ink">
        <span aria-hidden>🌤</span> 오늘의 청년부
      </h2>

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
    </section>
  );
}
