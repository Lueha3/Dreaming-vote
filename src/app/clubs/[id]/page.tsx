"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CLUB_CATEGORY_META } from "@/lib/clubCategories";
import { ClubImageCarousel, type CarouselImage } from "@/components/ClubImageCarousel";
import { ClubLineupBoard, type LineupMember } from "@/components/ClubLineupBoard";
import { ClubMeetingCalendar } from "@/components/ClubMeetingCalendar";
import { RoleBadge } from "@/components/RoleBadge";

type PageProps = { params: Promise<{ id: string }> | { id: string } };

type ClubDetail = {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string;
  maxMembers: number | null;
  viewCount: number;
  isApproved: boolean;
  isActive: boolean;
  createdAt: string;
  ownerNickname: string | null;
  ownerAvatarUrl: string | null;
  memberCount: number;
  lineup: LineupMember[];
  images: CarouselImage[];
};

type DetailResponse = {
  ok: true;
  isLoggedIn: boolean;
  isOwner: boolean;
  myApplicationStatus: string | null;
  membershipStatus: string | null;
  isMember: boolean;
  club: ClubDetail;
};

function splitTags(tags: string): string[] {
  return tags
    .split(/[,，、]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export default function ClubDetailPage({ params }: PageProps) {
  const [id, setId] = useState<string | null>(null);
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // 신청 폼 상태
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyMessage, setApplyMessage] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const resolve = async () => {
      const resolved = params instanceof Promise ? await params : params;
      setId(resolved.id);
    };
    resolve();
  }, [params]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/clubs/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((json: DetailResponse | { ok: false }) => {
        if (cancelled) return;
        if (json.ok) {
          setData(json);
          setStatus(json.myApplicationStatus);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 80);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  async function handleApply() {
    if (!id) return;
    setApplying(true);
    setApplyError(null);
    try {
      const res = await fetch(`/api/clubs/${id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: applyMessage.trim() || null }),
      });
      const json = await res.json();
      if (json.ok) {
        setStatus("pending");
        setApplyOpen(false);
        setApplyMessage("");
      } else {
        setApplyError(json.error ?? "신청에 실패했어요. 잠시 후 다시 시도해주세요.");
      }
    } catch {
      setApplyError("네트워크 오류. 잠시 후 다시 시도해주세요.");
    }
    setApplying(false);
  }

  /* ── 로딩 ──────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <main className="relative mx-auto max-w-2xl px-4 py-14">
          <div className="h-6 w-24 animate-pulse rounded bg-white/55" />
          <div className="glass-card mt-6 h-64 animate-pulse" />
        </main>
      </div>
    );
  }

  /* ── 없음 ──────────────────────────────────────────────────── */
  if (notFound || !data) {
    return (
      <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
        <div className="relative text-center px-6">
          <div className="mb-6 text-5xl">🔍</div>
          <h2 className="mb-3 text-2xl font-bold text-ink">동아리를 찾을 수 없어요</h2>
          <p className="mb-8 text-sm text-ink-soft">
            삭제되었거나 아직 승인되지 않은 동아리일 수 있어요.
          </p>
          <Link
            href="/clubs"
            className="btn-gold inline-block rounded-full px-6 py-3 text-sm"
          >
            동아리 목록으로
          </Link>
        </div>
      </div>
    );
  }

  const { club, isOwner, isLoggedIn, membershipStatus } = data;
  const tags = splitTags(club.tags);
  const pending = !club.isApproved || !club.isActive;

  return (
    <div className="relative min-h-screen bg-transparent pb-[120px]">
      {/* Sticky Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'glass-card rounded-none border-t-0 border-x-0 shadow-sm' : 'bg-transparent border-transparent'}`}>
        <div className="mx-auto max-w-2xl flex items-center h-14 px-4">
          <Link href="/clubs" className={`flex items-center justify-center h-9 w-9 rounded-full transition-all ${scrolled ? 'hover:bg-black/5 text-ink' : 'bg-white/70 backdrop-blur-md shadow-sm hover:bg-white/90 text-ink'}`}>
            <span className="text-xl leading-none pb-0.5">←</span>
          </Link>
          <div className={`ml-3 flex-1 text-lg font-bold text-ink transition-opacity duration-300 ${scrolled ? 'opacity-100' : 'opacity-0'}`}>
            {club.name}
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-2xl">
        {/* 히어로 이미지 캐러셀 (Full Bleed) */}
        {club.images?.length > 0 ? (
          <div className="w-full relative z-0">
            <ClubImageCarousel images={club.images} fullBleed={true} />
          </div>
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-skyx/30 to-teal/15 relative z-0" />
        )}

        <div className={`px-4 relative z-10 ${club.images?.length > 0 ? '-mt-8' : '-mt-8'}`}>
          {/* 본문 카드 */}
          <div className="glass-card glass-ribbon relative overflow-hidden p-6 sm:p-8 card-glow bg-white/85 shadow-[0_4px_24px_-8px_rgba(74,144,194,0.4)] mb-6">
            {/* 개설자 본인 + 승인 대기 안내 */}
            {isOwner && pending && (
              <div className="mb-5 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold-ink">
                {!club.isApproved
                  ? "관리자 승인을 기다리는 중이에요. 승인되면 다른 청년들에게 공개됩니다."
                  : "지금은 숨김 처리된 동아리예요."}
              </div>
            )}

            {/* 카테고리 + 메타 */}
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="glass-soft rounded-full px-2.5 py-0.5 text-ink-soft font-medium">
                {club.category}
              </span>
              <span className="text-ink-faint">
                멤버 {club.memberCount}
                {club.maxMembers ? `/${club.maxMembers}` : ""}명
              </span>
              <span className="text-ink-faint">· 조회 {club.viewCount}</span>
            </div>

            {/* 제목 */}
            <div className="mb-5 flex items-start gap-3">
              <span className="text-3xl">
                {CLUB_CATEGORY_META[club.category]?.emoji ?? "✨"}
              </span>
              <h1 className="flex-1 text-2xl font-bold leading-snug text-ink">{club.name}</h1>
            </div>

            {/* 키워드 */}
            {tags.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-1.5">
                {tags.map((t, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-teal/20 bg-teal/5 px-2.5 py-1 text-xs text-teal-ink font-medium"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* 소개 */}
            <div className="mb-6 whitespace-pre-wrap text-sm leading-relaxed text-ink/90">
              {club.description}
            </div>

            {/* 개설자 */}
            <div className="flex items-center gap-2 border-t border-sky-line pt-5 text-sm text-ink-soft">
              {club.ownerAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={club.ownerAvatarUrl}
                  alt=""
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-skyx/25 text-xs text-skyx-ink">
                  {(club.ownerNickname ?? "익")[0]}
                </div>
              )}
              <span>개설자 {club.ownerNickname ?? "익명"}</span>
              <RoleBadge role="club_leader" size="sm" />
            </div>
          </div>

          {/* 우리 라인업 */}
          {club.lineup?.length > 0 && (
            <div className="mb-6 relative z-10">
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                  <span>👋</span> 멤버 라인업
                </h2>
                <span className="text-xs text-ink-faint">{club.memberCount}명 참여 중</span>
              </div>
              <ClubLineupBoard lineup={club.lineup} maxMembers={club.maxMembers} />
            </div>
          )}

          {/* 모임 일정 캘린더 */}
          <div className="mb-6 relative z-10">
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                <span>🗓️</span> 모임 일정
              </h2>
            </div>
            <ClubMeetingCalendar
              clubId={club.id}
              isMember={data.isMember}
              isOwner={isOwner}
              membershipStatus={membershipStatus}
            />
          </div>
        </div>
      </main>

      {/* Sticky Bottom CTA Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/40 bg-white/60 pb-safe backdrop-blur-xl shadow-[0_-8px_20px_-10px_rgba(0,0,0,0.05)]">
        <div className="mx-auto max-w-2xl px-4 py-3">
          {renderCta()}
        </div>
      </div>
    </div>
  );

  /* ── 가입 CTA 렌더 ─────────────────────────────────────────── */
  function renderCta() {
    // 개설자 본인
    if (isOwner) {
      return (
        <Link
          href="/my/clubs"
          className="glass-card block px-5 py-3.5 text-center text-sm font-medium text-ink-soft transition-all hover:border-teal/40 hover:text-ink w-full bg-white/80"
        >
          내가 개설한 동아리예요 · 신청 관리하기 →
        </Link>
      );
    }

    // 비로그인
    if (!isLoggedIn) {
      return (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-ink-soft hidden sm:block">가입을 신청하려면 로그인이 필요해요.</p>
          <Link
            href={`/login?next=/clubs/${club.id}`}
            className="btn-gold flex-1 text-center rounded-xl px-6 py-3.5 text-sm font-bold"
          >
            로그인하고 신청하기
          </Link>
        </div>
      );
    }

    // 신청 상태별
    if (status === "pending") {
      return (
        <div className="rounded-xl border border-gold/40 bg-gold/10 px-5 py-3.5 text-center text-sm font-medium text-gold-ink w-full">
          ⏳ 가입 신청 완료 — 승인 대기 중
        </div>
      );
    }
    if (status === "accepted") {
      return (
        <div className="rounded-xl border border-teal/35 bg-teal/10 px-5 py-3.5 text-center text-sm font-medium text-teal-ink w-full">
          ✓ 가입된 동아리예요!
        </div>
      );
    }

    // 멤버 승인 전
    if (membershipStatus !== "approved") {
      return (
        <Link
          href="/join"
          className="btn-gold block w-full text-center rounded-xl px-6 py-3.5 text-sm font-bold"
        >
          {membershipStatus === "pending" ? "청년부 승인 대기 중 · 현황 보기" : "동아리 신청 전 청년부 가입하기"}
        </Link>
      );
    }

    // null 또는 rejected → 신청 가능
    return (
      <div className="w-full">
        {applyOpen ? (
          <div className="space-y-3 pt-2">
            <textarea
              value={applyMessage}
              onChange={(e) => setApplyMessage(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="개설자에게 전할 한마디 (선택)"
              className="w-full rounded-xl border border-sky-line bg-white/80 px-4 py-3 text-sm leading-relaxed text-ink placeholder:text-ink-faint focus:border-teal focus:outline-none"
            />
            {applyError && (
              <p className="text-sm text-red-500 px-1">{applyError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setApplyOpen(false);
                  setApplyError(null);
                }}
                className="glass-soft rounded-xl px-5 py-3 text-sm font-medium text-ink-soft transition-all hover:bg-white hover:text-ink w-1/3"
              >
                취소
              </button>
              <button
                onClick={handleApply}
                disabled={applying}
                className="btn-gold flex-1 rounded-xl px-6 py-3 text-sm font-bold shadow-md"
              >
                {applying ? "신청 중..." : "신청 보내기"}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setApplyOpen(true)}
            className="btn-gold block w-full rounded-xl px-6 py-3.5 text-sm font-bold shadow-[0_4px_14px_-4px_rgba(240,180,41,0.5)]"
          >
            {status === "rejected" ? "다시 가입 신청하기" : "가입 신청하기"}
          </button>
        )}
      </div>
    );
  }
}
