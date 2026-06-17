"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export type ClubMeeting = {
  id: string;
  title: string;
  meetsAt: string; // ISO
  place: string;
  items: string | null;
  fee: string | null;
  note: string | null;
  reviewCount?: number;
  imageCount?: number;
  coverImage?: string | null;
};

type Props = {
  clubId: string;
  isMember: boolean;
  isOwner: boolean;
  /** 앱 멤버십(가입승인) 상태 — 미승인 개설자에게 공지 버튼 대신 /join 동선을 보여준다 */
  membershipStatus?: string | null;
};

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
}

function fmtDateShort(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}(${DAY_LABELS[d.getDay()]})`;
}

export function ClubMeetingCalendar({ clubId, isMember, isOwner, membershipStatus }: Props) {
  const router = useRouter();
  const [meetings, setMeetings] = useState<ClubMeeting[]>([]);
  const [loading, setLoading] = useState(isMember);
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-based
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // 개설자 모임 생성 폼
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("정기 모임");
  const [meetsAt, setMeetsAt] = useState("");
  const [place, setPlace] = useState("");
  const [items, setItems] = useState("");
  const [fee, setFee] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch(`/api/clubs/${clubId}/meetings`, { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setMeetings(json.meetings);
    } catch {
      /* 조용히 무시 — 캘린더는 부가 기능 */
    }
    setLoading(false);
  }

  useEffect(() => {
    if (isMember) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, isMember]);

  // 바깥 클릭 시 미리보기 닫기
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setPreviewKey(null);
    }
    if (previewKey) document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [previewKey]);

  /* ── 비멤버: 잠금 티저 ─────────────────────────────────── */
  if (!isMember) {
    return (
      <div className="glass-card p-6 text-center">
        <div className="mb-2 text-2xl">🗓️</div>
        <p className="text-sm font-semibold text-ink">모임 일정은 멤버에게 공개돼요</p>
        <p className="mt-1 text-xs text-ink-faint">
          가입하면 모임 시간·장소·후기·사진을 함께 볼 수 있어요.
        </p>
      </div>
    );
  }

  const byDay = new Map<string, ClubMeeting[]>();
  for (const m of meetings) {
    const k = dateKey(new Date(m.meetsAt));
    byDay.set(k, [...(byDay.get(k) ?? []), m]);
  }

  const nextMeeting = meetings.find((m) => new Date(m.meetsAt).getTime() >= Date.now());

  // 월 그리드 계산
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function moveMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setPreviewKey(null);
  }

  function goToMeeting(id: string) {
    router.push(`/clubs/${clubId}/meetings/${id}`);
  }

  // 날짜 클릭: 1번째 = 미리보기, 같은 날 2번째 = 상세 이동(단일 모임일 때)
  function handleDayClick(k: string) {
    const ms = byDay.get(k) ?? [];
    if (ms.length === 0) {
      setPreviewKey(null);
      return;
    }
    if (previewKey === k) {
      if (ms.length === 1) goToMeeting(ms[0].id);
    } else {
      setPreviewKey(k);
    }
  }

  function openCreateForm() {
    setTitle("정기 모임");
    setMeetsAt("");
    setPlace("");
    setItems("");
    setFee("");
    setNote("");
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!meetsAt || !place.trim()) {
      setFormError("일시와 장소는 꼭 입력해주세요.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      title: title.trim() || "정기 모임",
      meetsAt: new Date(meetsAt).toISOString(),
      place: place.trim(),
      items: items.trim() || null,
      fee: fee.trim() || null,
      note: note.trim() || null,
    };
    try {
      const res = await fetch(`/api/clubs/${clubId}/meetings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.ok) {
        setFormOpen(false);
        const d = new Date(meetsAt);
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
        await load();
      } else {
        setFormError(json.error ?? "저장에 실패했어요. 다시 시도해주세요.");
      }
    } catch {
      setFormError("네트워크 오류. 잠시 후 다시 시도해주세요.");
    }
    setSaving(false);
  }

  const previewMeetings = previewKey ? (byDay.get(previewKey) ?? []) : [];
  const todayKey = dateKey(today);

  return (
    <div ref={rootRef} className="glass-card glass-ribbon relative overflow-hidden p-5 sm:p-6">
      {/* 헤더 */}
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-bold text-ink">🗓️ 모임 일정</h2>
        {isOwner &&
          (membershipStatus === "approved" ? (
            <button
              onClick={() => (formOpen ? setFormOpen(false) : openCreateForm())}
              className="rounded-full border border-gold/45 bg-gold/15 px-3 py-1 text-xs font-bold text-gold-ink transition-all hover:bg-gold/25"
            >
              {formOpen ? "닫기" : "+ 모임 공지"}
            </button>
          ) : (
            <Link
              href="/join"
              className="rounded-full border border-skyx/45 bg-skyx/15 px-3 py-1 text-xs font-bold text-skyx-ink transition-all hover:bg-skyx/25"
            >
              {membershipStatus === "pending" ? "승인 후 공지 가능 ⏳" : "가입 승인 후 공지 가능 →"}
            </Link>
          ))}
      </div>

      {/* 다음 모임 스트립 */}
      {nextMeeting ? (
        <Link
          href={`/clubs/${clubId}/meetings/${nextMeeting.id}`}
          className="mb-4 block text-xs text-ink-soft transition-colors hover:text-skyx-ink"
        >
          다음 모임 ·{" "}
          <span className="font-semibold text-ink">
            {fmtDateShort(nextMeeting.meetsAt)} {fmtTime(nextMeeting.meetsAt)}
          </span>{" "}
          · {nextMeeting.place} <span className="text-skyx-ink">→</span>
        </Link>
      ) : (
        <p className="mb-4 text-xs text-ink-faint">
          {isOwner ? "예정된 모임이 없어요. 첫 모임을 공지해볼까요?" : "아직 예정된 모임이 없어요."}
        </p>
      )}

      {/* 개설자 폼 */}
      {formOpen && (
        <form onSubmit={handleSave} className="glass-soft mb-5 space-y-3 rounded-xl p-4">
          <p className="text-xs font-semibold text-ink">새 모임 공지</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] text-ink-soft">모임명</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={60}
                className="w-full rounded-lg border border-white/95 bg-white/75 px-3 py-2 text-sm text-ink focus:border-teal focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-ink-soft">일시 *</label>
              <input
                type="datetime-local"
                value={meetsAt}
                onChange={(e) => setMeetsAt(e.target.value)}
                className="w-full rounded-lg border border-white/95 bg-white/75 px-3 py-2 text-sm text-ink focus:border-teal focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-ink-soft">장소 *</label>
              <input
                type="text"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="예: 본당 2층 카페"
                maxLength={100}
                className="w-full rounded-lg border border-white/95 bg-white/75 px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-teal focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-ink-soft">회비</label>
              <input
                type="text"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="예: 5,000원 (없으면 비워두세요)"
                maxLength={50}
                className="w-full rounded-lg border border-white/95 bg-white/75 px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-teal focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-ink-soft">준비물</label>
            <input
              type="text"
              value={items}
              onChange={(e) => setItems(e.target.value)}
              placeholder="예: 성경, 필기구, 운동화"
              maxLength={200}
              className="w-full rounded-lg border border-white/95 bg-white/75 px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-teal focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-ink-soft">일정·안내</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="모임 흐름, 오시는 길 등 자유롭게 적어주세요."
              className="w-full rounded-lg border border-white/95 bg-white/75 px-3 py-2 text-sm leading-relaxed text-ink placeholder:text-ink-faint focus:border-teal focus:outline-none"
            />
          </div>
          {formError && <p className="text-xs text-red-500">{formError}</p>}
          <button
            type="submit"
            disabled={saving}
            className="btn-gold w-full rounded-lg py-2.5 text-sm font-semibold disabled:opacity-40"
          >
            {saving ? "저장 중..." : "공지 올리기"}
          </button>
        </form>
      )}

      {/* 월 이동 */}
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => moveMonth(-1)}
          className="glass-soft flex h-7 w-7 items-center justify-center rounded-lg text-ink-soft transition-colors hover:text-ink"
          aria-label="이전 달"
        >
          ‹
        </button>
        <p className="text-sm font-bold text-ink">
          {viewYear}년 {viewMonth + 1}월
        </p>
        <button
          onClick={() => moveMonth(1)}
          className="glass-soft flex h-7 w-7 items-center justify-center rounded-lg text-ink-soft transition-colors hover:text-ink"
          aria-label="다음 달"
        >
          ›
        </button>
      </div>

      {/* 캘린더 그리드 */}
      {loading ? (
        <div className="h-48 animate-pulse rounded-xl bg-white/55" />
      ) : (
        <div className="grid grid-cols-7 gap-y-1 text-center">
          {DAY_LABELS.map((d, i) => (
            <div
              key={d}
              className={`pb-1 text-[11px] font-semibold ${i === 0 ? "text-red-400/80" : "text-ink-faint"}`}
            >
              {d}
            </div>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <div key={`e${i}`} />;
            const k = `${viewYear}-${viewMonth}-${day}`;
            const dayMeetings = byDay.get(k) ?? [];
            const hasMeeting = dayMeetings.length > 0;
            const isToday = k === todayKey;
            const isActive = previewKey === k;
            return (
              <button
                key={k}
                onClick={() => handleDayClick(k)}
                // 마우스 hover로만 미리보기 — 터치는 합성 hover로 1탭이 곧장 이동하는 걸 막기 위해 제외(터치는 click 2단계).
                onPointerEnter={(e) => {
                  if (e.pointerType === "mouse" && hasMeeting) setPreviewKey(k);
                }}
                disabled={!hasMeeting}
                className={`relative mx-auto flex h-9 w-9 flex-col items-center justify-center rounded-xl text-sm transition-all ${
                  hasMeeting
                    ? "cursor-pointer border border-gold/40 bg-gold/10 font-bold text-gold-ink hover:bg-gold/20"
                    : "text-ink-soft"
                } ${isToday ? "ring-2 ring-teal/45" : ""} ${isActive ? "ring-2 ring-gold/70" : ""}`}
              >
                {day}
                {hasMeeting && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-gold" />}
              </button>
            );
          })}
        </div>
      )}

      {/* 날짜 미리보기 — 한 번 더 누르면 상세로 이동 */}
      {previewMeetings.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-sky-line pt-4">
          <p className="px-0.5 text-[11px] font-medium text-ink-faint">
            {fmtDateShort(previewMeetings[0].meetsAt)} · 눌러서 상세 보기
          </p>
          {previewMeetings.map((m) => (
            <button
              key={m.id}
              onClick={() => goToMeeting(m.id)}
              className="glass-soft flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all hover:bg-white/85"
            >
              {m.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.coverImage}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-lg border border-sky-line object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-skyx/15 text-lg">
                  🗓️
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink">{m.title}</p>
                <p className="truncate text-[11px] text-ink-soft">
                  {fmtTime(m.meetsAt)} · {m.place}
                </p>
                <p className="mt-0.5 text-[10px] text-ink-faint">
                  💬 {m.reviewCount ?? 0} · 📸 {m.imageCount ?? 0}
                </p>
              </div>
              <span className="shrink-0 text-skyx-ink">→</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
