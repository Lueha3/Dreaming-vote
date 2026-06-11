"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CLUB_CATEGORY_META } from "@/lib/clubCategories";
import { ClubImageCarousel, type CarouselImage } from "@/components/ClubImageCarousel";

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
  images: CarouselImage[];
};

type DetailResponse = {
  ok: true;
  isLoggedIn: boolean;
  isOwner: boolean;
  myApplicationStatus: string | null;
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

  const { club, isOwner, isLoggedIn } = data;
  const tags = splitTags(club.tags);
  const pending = !club.isApproved || !club.isActive;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <main className="relative mx-auto max-w-2xl px-4 py-12">
        <Link
          href="/clubs"
          className="text-xs font-medium text-ink-faint transition-colors hover:text-skyx-ink"
        >
          ← 동아리 목록
        </Link>

        {/* 카드뉴스 캐러셀 */}
        {club.images?.length > 0 && (
          <div className="mt-5">
            <ClubImageCarousel images={club.images} />
          </div>
        )}

        {/* 본문 카드 */}
        <div className={`${club.images?.length > 0 ? "mt-4" : "mt-5"} glass-card glass-ribbon relative overflow-hidden p-6 sm:p-8 card-glow`}>
          {/* 개설자 본인 + 승인 대기 안내 */}
          {isOwner && pending && (
            <div className="mb-5 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold-ink">
              {!club.isApproved
                ? "관리자 승인을 기다리는 중이에요. 승인되면 다른 청년들에게 공개됩니다."
                : "지금은 숨김 처리된 동아리예요."}
            </div>
          )}

          {/* 제목 */}
          <div className="mb-1 flex items-start gap-3">
            <span className="text-3xl">
              {CLUB_CATEGORY_META[club.category]?.emoji ?? "✨"}
            </span>
            <h1 className="flex-1 text-2xl font-bold leading-snug text-ink">{club.name}</h1>
          </div>

          {/* 카테고리 + 메타 */}
          <div className="mb-5 flex flex-wrap items-center gap-2 text-xs">
            <span className="glass-soft rounded-full px-2.5 py-0.5 text-ink-soft">
              {club.category}
            </span>
            <span className="text-ink-faint">
              멤버 {club.memberCount}
              {club.maxMembers ? `/${club.maxMembers}` : ""}명
            </span>
            <span className="text-ink-faint">· 조회 {club.viewCount}</span>
          </div>

          {/* 소개 */}
          <div className="mb-6 whitespace-pre-wrap text-sm leading-relaxed text-ink">
            {club.description}
          </div>

          {/* 키워드 */}
          {tags.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-1.5">
              {tags.map((t, i) => (
                <span
                  key={i}
                  className="rounded-full border border-gold/35 bg-gold/10 px-2.5 py-0.5 text-xs text-gold-ink"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

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
          </div>
        </div>

        {/* CTA */}
        <div className="mt-5">{renderCta()}</div>
      </main>
    </div>
  );

  /* ── 가입 CTA 렌더 ─────────────────────────────────────────── */
  function renderCta() {
    // 개설자 본인
    if (isOwner) {
      return (
        <Link
          href="/my/clubs"
          className="glass-card block px-5 py-4 text-center text-sm font-medium text-ink-soft transition-all hover:border-teal/40 hover:text-ink"
        >
          내가 개설한 동아리예요 · 신청 관리하기 →
        </Link>
      );
    }

    // 비로그인
    if (!isLoggedIn) {
      return (
        <div className="glass-card p-5 text-center">
          <p className="mb-4 text-sm text-ink-soft">가입을 신청하려면 로그인이 필요해요.</p>
          <Link
            href={`/login?next=/clubs/${club.id}`}
            className="btn-gold inline-block rounded-full px-6 py-3 text-sm"
          >
            로그인하고 신청하기
          </Link>
        </div>
      );
    }

    // 신청 상태별
    if (status === "pending") {
      return (
        <div className="rounded-2xl border border-gold/40 bg-gold/10 px-5 py-4 text-center text-sm font-medium text-gold-ink">
          ⏳ 가입 신청 완료 — 개설자 승인을 기다리는 중이에요.
        </div>
      );
    }
    if (status === "accepted") {
      return (
        <div className="rounded-2xl border border-teal/35 bg-teal/10 px-5 py-4 text-center text-sm font-medium text-teal-ink">
          ✓ 가입된 동아리예요!
        </div>
      );
    }

    // null 또는 rejected → 신청 가능
    return (
      <div className="glass-card p-5">
        {status === "rejected" && (
          <p className="mb-3 text-center text-sm text-ink-soft">
            이전 신청은 거절되었어요. 다시 신청할 수 있어요.
          </p>
        )}

        {applyOpen ? (
          <div className="space-y-3">
            <textarea
              value={applyMessage}
              onChange={(e) => setApplyMessage(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="개설자에게 전할 한마디 (선택) — 가입 동기, 관심사 등"
              className="w-full rounded-xl border border-white/95 bg-white/70 px-4 py-3 text-sm leading-relaxed text-ink placeholder:text-ink-faint focus:border-teal focus:outline-none"
            />
            {applyError && (
              <p className="text-sm text-red-500">{applyError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleApply}
                disabled={applying}
                className="btn-gold flex-1 rounded-xl px-6 py-3 text-sm"
              >
                {applying ? "신청 중..." : "신청 보내기"}
              </button>
              <button
                onClick={() => {
                  setApplyOpen(false);
                  setApplyError(null);
                }}
                className="glass-soft rounded-xl px-5 py-3 text-sm font-medium text-ink-soft transition-all hover:bg-white/90 hover:text-ink"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setApplyOpen(true)}
            className="btn-gold block w-full rounded-xl px-6 py-3.5 text-sm"
          >
            가입 신청하기
          </button>
        )}
      </div>
    );
  }
}
