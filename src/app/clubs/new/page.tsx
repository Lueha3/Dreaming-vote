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
        setError(data.error ?? "개설에 실패했습니다. 잠시 후 다시 시도해주세요.");
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
      <div className="relative min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
        <AmbientGlow />
        <main className="relative mx-auto max-w-2xl px-4 py-14">
          <div className="h-8 w-48 animate-pulse rounded bg-white/5" />
          <div className="mt-6 h-72 animate-pulse rounded-2xl border border-white/[0.07] bg-[#111111]" />
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
            동아리를 개설하려면 로그인을 해주세요.
          </p>
          <Link
            href="/login?next=/clubs/new"
            className="inline-block rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 btn-glow"
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
      <div className="relative min-h-screen bg-[#0a0a0a] text-white overflow-hidden flex items-center justify-center">
        <AmbientGlow />
        <div className="relative text-center px-6">
          <div className="mb-6 text-5xl">🎉</div>
          <h2 className="mb-3 text-2xl font-bold text-white">개설 신청 완료!</h2>
          <p className="mb-8 text-sm text-zinc-500 leading-relaxed">
            관리자 승인 후 동아리 목록에 노출됩니다.
            <br />
            승인 현황은 &lsquo;내 동아리&rsquo;에서 확인할 수 있어요.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/clubs"
              className="inline-block rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 btn-glow"
            >
              동아리 둘러보기 →
            </Link>
            <Link
              href="/my/clubs"
              className="inline-block rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-zinc-300 transition-all hover:border-white/20 hover:text-white"
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
    <div className="relative min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      <AmbientGlow />

      <main className="relative mx-auto max-w-2xl px-4 py-14">
        <div className="mb-8">
          <Link href="/clubs" className="text-xs text-zinc-500 transition-colors hover:text-zinc-300">
            ← 동아리 목록
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-white">동아리 개설</h1>
          <p className="mt-1 text-sm text-zinc-500">
            개설 후 관리자 승인을 거쳐 다른 유저에게 노출됩니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-2xl border border-white/[0.07] bg-[#111111] p-6 space-y-5">
            {/* 이름 */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">동아리 이름</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                className="w-full rounded-xl border border-white/[0.07] bg-black/30 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                placeholder="예: 새벽 알고리즘 스터디"
                required
              />
            </div>

            {/* 카테고리 */}
            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-400">카테고리</label>
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
                          ? "border-violet-500/50 bg-violet-500/15 text-violet-200"
                          : "border-white/[0.07] bg-black/30 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
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
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">소개</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                maxLength={2000}
                className="w-full rounded-xl border border-white/[0.07] bg-black/30 px-4 py-3 text-sm leading-relaxed text-zinc-300 placeholder-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                placeholder="어떤 활동을 하는 동아리인가요? 어떤 사람과 함께하고 싶나요?"
                required
              />
              <p className="mt-1.5 text-right text-xs text-zinc-600">{description.length}/2000</p>
            </div>

            {/* 키워드 (AI 매칭용) */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                키워드{" "}
                <span className="font-normal text-zinc-600">(쉼표로 구분 · AI 추천에 활용)</span>
              </label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                maxLength={200}
                className="w-full rounded-xl border border-white/[0.07] bg-black/30 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                placeholder="예: 코딩, 알고리즘, 성장, 몰입, 협업"
                required
              />
            </div>

            {/* 최대 인원 (선택) */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                최대 인원{" "}
                <span className="font-normal text-zinc-600">(선택 · 비우면 제한 없음)</span>
              </label>
              <input
                value={maxMembers}
                onChange={(e) => setMaxMembers(e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                className="w-full rounded-xl border border-white/[0.07] bg-black/30 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                placeholder="예: 20"
              />
            </div>
          </div>

          {/* 카드뉴스 이미지 */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#111111] p-6">
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              카드뉴스 이미지{" "}
              <span className="font-normal text-zinc-600">(선택 · 최대 10장 · 승인 화면에서 검토됩니다)</span>
            </label>
            <p className="mb-4 text-xs text-zinc-600">
              동아리를 소개하는 카드뉴스 이미지를 올려주세요. Canva 등으로 만든 이미지를 추천합니다.
            </p>
            <ClubImageUploader onChange={setImages} maxImages={10} />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 btn-glow"
            >
              {saving ? "개설 중..." : "동아리 개설하기"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-zinc-400 transition-all hover:border-white/20 hover:text-zinc-200"
            >
              취소
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

function AmbientGlow() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full bg-violet-600/8 blur-[120px]" />
      <div className="absolute top-1/2 -left-24 w-[300px] h-[300px] rounded-full bg-blue-600/6 blur-[100px]" />
    </div>
  );
}
