"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CLUB_CATEGORIES, CLUB_CATEGORY_META } from "@/lib/clubCategories";
import { ClubImageUploader, type ClubImageItem } from "@/components/ClubImageUploader";

export default function NewClubPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [notLoggedIn, setNotLoggedIn] = useState(false);

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
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) setNotLoggedIn(true);
      setChecking(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!category) {
      setError("카테고리를 선택해주세요.");
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
        setError(data.error ?? "개설에 실패했어요. 잠시 후 다시 시도해주세요.");
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
          <div className="glass-card p-6 space-y-5">
            {/* 이름 */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-soft">동아리 이름</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                className="w-full rounded-xl border border-white/95 bg-white/70 px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-teal focus:outline-none"
                placeholder="예: 새벽 알고리즘 스터디"
                required
              />
            </div>

            {/* 카테고리 */}
            <div>
              <label className="mb-2 block text-xs font-medium text-ink-soft">카테고리</label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {CLUB_CATEGORIES.map((cat) => {
                  const active = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-medium transition-all ${
                        active
                          ? "border-teal/50 bg-teal/15 text-teal-ink"
                          : "border-white/90 bg-white/60 text-ink-soft hover:bg-white/90 hover:text-ink"
                      }`}
                    >
                      <span>{CLUB_CATEGORY_META[cat]?.emoji}</span>
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 소개 */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-soft">소개</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                maxLength={2000}
                className="w-full rounded-xl border border-white/95 bg-white/70 px-4 py-3 text-sm leading-relaxed text-ink placeholder:text-ink-faint focus:border-teal focus:outline-none"
                placeholder="어떤 활동을 하는 동아리인가요? 어떤 사람과 함께하고 싶나요?"
                required
              />
              <p className="mt-1.5 text-right text-xs text-ink-faint">{description.length}/2000</p>
            </div>

            {/* 키워드 (AI 매칭용) */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-soft">
                키워드{" "}
                <span className="font-normal text-ink-faint">(쉼표로 구분 · AI 추천에 활용)</span>
              </label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                maxLength={200}
                className="w-full rounded-xl border border-white/95 bg-white/70 px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-teal focus:outline-none"
                placeholder="예: 코딩, 알고리즘, 성장, 몰입, 협업"
                required
              />
            </div>

            {/* 최대 인원 (선택) */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-soft">
                최대 인원{" "}
                <span className="font-normal text-ink-faint">(선택 · 비우면 제한 없음)</span>
              </label>
              <input
                value={maxMembers}
                onChange={(e) => setMaxMembers(e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                className="w-full rounded-xl border border-white/95 bg-white/70 px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-teal focus:outline-none"
                placeholder="예: 20"
              />
            </div>
          </div>

          {/* 카드뉴스 이미지 */}
          <div className="glass-card p-6">
            <label className="mb-1 block text-xs font-medium text-ink-soft">
              카드뉴스 이미지{" "}
              <span className="font-normal text-ink-faint">(선택 · 최대 10장 · 승인 화면에서 검토됩니다)</span>
            </label>
            <p className="mb-4 text-xs text-ink-faint">
              동아리를 소개하는 카드뉴스 이미지를 올려주세요. Canva 등으로 만든 이미지를 추천합니다.
            </p>
            <ClubImageUploader onChange={setImages} maxImages={10} />
          </div>

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
