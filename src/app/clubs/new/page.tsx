"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type ClubImageItem } from "@/components/ClubImageUploader";
import { ClubFormFields } from "@/components/ClubFormFields";

export default function NewClubPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState<string>("approved");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [tags, setTags] = useState("");
  const [maxMembers, setMaxMembers] = useState("");
  const [images, setImages] = useState<ClubImageItem[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // 로그인+멤버십을 /api/membership 한 번으로 확정(401=비로그인).
    // 기존: 클라 getUser()(네트워크) → /api/membership(서버 getUser 재실행) 2왕복 → 1왕복.
    // membershipStatus만 쓰므로 summary 응답(PII 미포함)으로 충분.
    fetch("/api/membership?fields=summary", { cache: "no-store" })
      .then((res) => {
        if (res.status === 401) {
          setNotLoggedIn(true);
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then((json) => {
        if (json?.ok) setMembershipStatus(json.membership.membershipStatus);
      })
      .catch(() => {
        /* 확인 실패 시 폼은 보여주되 제출에서 서버가 거른다 */
      })
      .finally(() => setChecking(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!category) {
      setError("카테고리를 선택해주세요.");
      return;
    }
    if (images.length === 0) {
      setError("동아리 대표 사진을 1장 이상 올려주세요.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          category,
          tags,
          maxMembers: maxMembers.trim() ? Number(maxMembers) : null,
          images,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setDone(true);
      } else {
        // fieldErrors가 있으면 첫 번째 오류 메시지를 구체적으로 표시
        const fieldErrors = data.fieldErrors as Record<string, string[]> | undefined;
        const firstFieldError = fieldErrors
          ? Object.values(fieldErrors).flat()[0]
          : undefined;
        setError(firstFieldError ?? data.error ?? "개설에 실패했어요. 잠시 후 다시 시도해주세요.");
        setSaving(false);
      }
    } catch {
      setError("네트워크 오류. 잠시 후 다시 시도해주세요.");
      setSaving(false);
    }
  }

  /* ── 로그인 확인 중 ─────────────────────────────────────────── */
  if (checking) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <main className="relative mx-auto max-w-2xl px-4 py-14">
          <div className="h-8 w-48 animate-pulse rounded bg-white/55" />
          <div className="glass-card mt-6 h-72 animate-pulse" />
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
          <h2 className="mb-3 text-2xl font-bold text-ink">로그인이 필요해요</h2>
          <p className="mb-8 text-sm text-ink-soft leading-relaxed">
            동아리를 개설하려면 로그인을 해주세요.
          </p>
          <Link
            href="/login?next=/clubs/new"
            className="btn-gold inline-block rounded-full px-6 py-3 text-sm"
          >
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  /* ── 멤버 승인 전 ──────────────────────────────────────────── */
  if (membershipStatus !== "approved") {
    return (
      <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
        <div className="relative text-center px-6">
          <div className="mb-6 text-5xl">⛪</div>
          <h2 className="mb-3 text-2xl font-bold text-ink">
            {membershipStatus === "pending" ? "승인을 기다리는 중이에요" : "청년부 멤버 확인이 필요해요"}
          </h2>
          <p className="mb-8 text-sm text-ink-soft leading-relaxed">
            {membershipStatus === "pending"
              ? "가입 신청이 승인되면 동아리를 개설할 수 있어요."
              : "동아리 개설은 청년부 가입 신청 후 관리자 승인을 받으면 할 수 있어요."}
          </p>
          <Link
            href="/join"
            className="btn-gold inline-block rounded-full px-6 py-3 text-sm"
          >
            {membershipStatus === "pending" ? "신청 현황 보기" : "청년부 가입 신청하기"}
          </Link>
        </div>
      </div>
    );
  }

  /* ── 개설 완료 ─────────────────────────────────────────────── */
  if (done) {
    return (
      <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
        <div className="relative text-center px-6">
          <div className="mb-6 text-5xl">🎉</div>
          <h2 className="mb-3 text-2xl font-bold text-ink">개설 신청 완료!</h2>
          <p className="mb-8 text-sm text-ink-soft leading-relaxed">
            관리자 승인 후 동아리 목록에 올라가요.
            <br />
            승인 현황은 &lsquo;내 동아리&rsquo;에서 확인할 수 있어요.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/clubs"
              className="btn-gold inline-block rounded-full px-6 py-3 text-sm"
            >
              동아리 둘러보기 →
            </Link>
            <Link
              href="/my/clubs"
              className="glass-soft inline-block rounded-full px-6 py-3 text-sm font-medium text-ink-soft transition-all hover:bg-white/90 hover:text-ink"
            >
              내 동아리
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── 개설 폼 ───────────────────────────────────────────────── */
  return (
    <div className="relative min-h-screen overflow-hidden">
      <main className="relative mx-auto max-w-2xl px-4 py-14">
        <div className="mb-8">
          <Link href="/clubs" className="text-xs font-medium text-ink-faint transition-colors hover:text-skyx-ink">
            ← 동아리 목록
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-ink">동아리 개설</h1>
          <p className="mt-1 text-sm text-ink-soft">
            개설 후 관리자 승인을 거쳐 다른 청년들에게 공개됩니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <ClubFormFields
            name={name}
            setName={setName}
            category={category}
            setCategory={setCategory}
            description={description}
            setDescription={setDescription}
            tags={tags}
            setTags={setTags}
            maxMembers={maxMembers}
            setMaxMembers={setMaxMembers}
            onImagesChange={setImages}
          />

          {error && (
            <div className="rounded-xl border border-red-300/60 bg-red-500/[0.08] px-4 py-2.5 text-sm text-red-500">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="btn-gold rounded-xl px-6 py-3 text-sm"
            >
              {saving ? "개설 중..." : "동아리 개설하기"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="glass-soft rounded-xl px-6 py-3 text-sm font-medium text-ink-soft transition-all hover:bg-white/90 hover:text-ink"
            >
              취소
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
