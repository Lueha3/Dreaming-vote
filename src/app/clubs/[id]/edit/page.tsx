"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { canManage, type Role } from "@/lib/roles";
import { type ClubImageItem } from "@/components/ClubImageUploader";
import { ClubFormFields } from "@/components/ClubFormFields";

type Gate = "loading" | "login" | "notfound" | "forbidden" | "ok";

export default function EditClubPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [gate, setGate] = useState<Gate>("loading");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [tags, setTags] = useState("");
  const [maxMembers, setMaxMembers] = useState("");
  const [images, setImages] = useState<ClubImageItem[]>([]);
  const [initialImages, setInitialImages] = useState<ClubImageItem[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setGate("loading"); // id 변경 시 폼을 언마운트→재마운트시켜 업로더가 새 이미지로 재시드되게 함
    (async () => {
      try {
        // 로그인/역할(권한 판정용)과 동아리 상세(prefill)를 병렬로 받는다.
        // prefill=1 — 수정 진입은 '조회'가 아니므로 viewCount를 올리지 않게 한다.
        const [meRes, clubRes] = await Promise.all([
          fetch("/api/membership?fields=summary", { cache: "no-store" }),
          fetch(`/api/clubs/${id}?prefill=1`, { cache: "no-store" }),
        ]);
        if (!alive) return;

        if (meRes.status === 401) {
          setGate("login");
          return;
        }
        const me = meRes.ok ? await meRes.json() : null;
        const role: Role | null = me?.ok ? me.membership.role ?? null : null;

        if (clubRes.status === 404) {
          setGate("notfound");
          return;
        }
        const data = clubRes.ok ? await clubRes.json() : null;
        if (!data?.ok || !data.club) {
          setGate("notfound");
          return;
        }

        // 개설자 본인 또는 운영진(staff+)만 수정 가능 — 서버 PATCH도 동일 게이트로 재검증.
        if (!data.isOwner && !canManage(role)) {
          setGate("forbidden");
          return;
        }

        const club = data.club;
        setName(club.name);
        setDescription(club.description);
        setCategory(club.category);
        setTags(club.tags);
        setMaxMembers(club.maxMembers != null ? String(club.maxMembers) : "");
        setInitialImages(club.images ?? []);
        setImages(club.images ?? []); // 제출 페이로드도 동일 값으로 시드
        setGate("ok");
      } catch {
        if (alive) setGate("notfound");
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

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
      // 이미지를 실제로 바꿨을 때만 전송 → 서버가 불필요한 전체 교체(delete+recreate)를 건너뛴다.
      const imagesDirty = JSON.stringify(images) !== JSON.stringify(initialImages);
      const res = await fetch(`/api/clubs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          category,
          tags,
          maxMembers: maxMembers.trim() ? Number(maxMembers) : null,
          ...(imagesDirty ? { images } : {}),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        router.push(`/clubs/${id}`);
        router.refresh();
      } else {
        const fieldErrors = data.fieldErrors as Record<string, string[]> | undefined;
        const firstFieldError = fieldErrors ? Object.values(fieldErrors).flat()[0] : undefined;
        setError(firstFieldError ?? data.error ?? "수정에 실패했어요. 잠시 후 다시 시도해주세요.");
        setSaving(false);
      }
    } catch {
      setError("네트워크 오류. 잠시 후 다시 시도해주세요.");
      setSaving(false);
    }
  }

  /* ── 로딩 ─────────────────────────────────────────────────── */
  if (gate === "loading") {
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
  if (gate === "login") {
    return (
      <CenteredNotice
        emoji="🔐"
        title="로그인이 필요해요"
        body="동아리를 수정하려면 로그인을 해주세요."
        href={`/login?next=/clubs/${id}/edit`}
        cta="로그인하기"
      />
    );
  }

  /* ── 권한 없음 ────────────────────────────────────────────── */
  if (gate === "forbidden") {
    return (
      <CenteredNotice
        emoji="🚫"
        title="수정 권한이 없어요"
        body="동아리 정보는 개설자 또는 운영진만 수정할 수 있어요."
        href={`/clubs/${id}`}
        cta="동아리로 돌아가기"
      />
    );
  }

  /* ── 없는 동아리 ──────────────────────────────────────────── */
  if (gate === "notfound") {
    return (
      <CenteredNotice
        emoji="🔍"
        title="동아리를 찾을 수 없어요"
        body="이미 삭제되었거나 주소가 올바르지 않아요."
        href="/clubs"
        cta="동아리 둘러보기"
      />
    );
  }

  /* ── 수정 폼 ──────────────────────────────────────────────── */
  return (
    <div className="relative min-h-screen overflow-hidden">
      <main className="relative mx-auto max-w-2xl px-4 py-14">
        <div className="mb-8">
          <Link
            href={`/clubs/${id}`}
            className="text-xs font-medium text-ink-faint transition-colors hover:text-skyx-ink"
          >
            ← 동아리로 돌아가기
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-ink">동아리 정보 수정</h1>
          <p className="mt-1 text-sm text-ink-soft">
            바꾼 내용은 저장 즉시 반영돼요. 카테고리·키워드를 바꾸면 추천 결과가 다시 계산돼요.
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
            initialImages={initialImages}
          />

          {error && (
            <div className="rounded-xl border border-red-300/60 bg-red-500/[0.08] px-4 py-2.5 text-sm text-red-500">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-gold rounded-xl px-6 py-3 text-sm">
              {saving ? "저장 중..." : "변경사항 저장"}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/clubs/${id}`)}
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

function CenteredNotice({
  emoji,
  title,
  body,
  href,
  cta,
}: {
  emoji: string;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <div className="relative px-6 text-center">
        <div className="mb-6 text-5xl">{emoji}</div>
        <h2 className="mb-3 text-2xl font-bold text-ink">{title}</h2>
        <p className="mb-8 text-sm leading-relaxed text-ink-soft">{body}</p>
        <Link href={href} className="btn-gold inline-block rounded-full px-6 py-3 text-sm">
          {cta}
        </Link>
      </div>
    </div>
  );
}
