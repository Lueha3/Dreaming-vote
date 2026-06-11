"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export type ClubMeeting = {
  id: string;
  title: string;
  meetsAt: string; // ISO
  place: string;
  items: string | null;
  fee: string | null;
  note: string | null;
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

/** Date → datetime-local input 값 (로컬 기준 YYYY-MM-DDTHH:mm) */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ClubMeetingCalendar({ clubId, isMember, isOwner, membershipStatus }: Props) {
  const [meetings, setMeetings] = useState<ClubMeeting[]>([]);
  const [loading, setLoading] = useState(isMember);
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-based
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // 개설자 폼
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  /* ── 비멤버: 잠금 티저 ─────────────────────────────────── */
  if (!isMember) {
    return (
      <div className="glass-card p-6 text-center">
        <div className="mb-2 text-2xl">🗓️</div>
        <p className="text-sm font-semibold text-ink">모임 일정은 멤버에게 공개돼요</p>
        <p className="mt-1 text-xs text-ink-faint">
          가입하면 모임 시간·장소·준비물을 볼 수 있어요.
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
    setSelectedKey(null);
  }

  function openCreateForm() {
    setEditingId(null);
    setTitle("정기 모임");
    setMeetsAt("");
    setPlace("");
    setItems("");
    setFee("");
    setNote("");
    setFormError(null);
    setFormOpen(true);
  }

  function openEditForm(m: ClubMeeting) {
    setEditingId(m.id);
    setTitle(m.title);
    setMeetsAt(toLocalInput(m.meetsAt));
    setPlace(m.place);
    setItems(m.items ?? "");
    setFee(m.fee ?? "");
    setNote(m.note ?? "");
    setFormError(null);
    setSelectedKey(null);
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
      const res = await fetch(
        editingId
          ? `/api/clubs/${clubId}/meetings/${editingId}`
          : `/api/clubs/${clubId}/meetings`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json();
      if (json.ok) {
        setFormOpen(false);
        // 등록한 모임의 달로 이동
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

  function openDay(k: string) {
    setDeletingId(null);
    setDeleteError(null);
    setSelectedKey(k);
  }

  function closeModal() {
    setDeletingId(null);
    setDeleteError(null);
    setSelectedKey(null);
  }

  async function handleDelete(m: ClubMeeting) {
    setDeleteError(null);
    try {
      const res = await fetch(`/api/clubs/${clubId}/meetings/${m.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setDeleteError(json?.error ?? "삭제에 실패했어요. 다시 시도해주세요.");
        return;
      }
      closeModal();
      await load();
    } catch {
      setDeleteError("네트워크 오류. 잠시 후 다시 시도해주세요.");
    }
  }

  const selectedMeetings = selectedKey ? (byDay.get(selectedKey) ?? []) : [];
  const todayKey = dateKey(today);

  return (
    <div className="glass-card glass-ribbon relative overflow-hidden p-5 sm:p-6">
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
        <p className="mb-4 text-xs text-ink-soft">
          다음 모임 ·{" "}
          <span className="font-semibold text-ink">
            {fmtDateShort(nextMeeting.meetsAt)} {fmtTime(nextMeeting.meetsAt)}
          </span>{" "}
          · {nextMeeting.place}
        </p>
      ) : (
        <p className="mb-4 text-xs text-ink-faint">
          {isOwner ? "예정된 모임이 없어요. 첫 모임을 공지해볼까요?" : "아직 예정된 모임이 없어요."}
        </p>
      )}

      {/* 개설자 폼 */}
      {formOpen && (
        <form onSubmit={handleSave} className="glass-soft mb-5 space-y-3 rounded-xl p-4">
          <p className="text-xs font-semibold text-ink">
            {editingId ? "모임 공지 수정" : "새 모임 공지"}
          </p>
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
            {saving ? "저장 중..." : editingId ? "수정 저장" : "공지 올리기"}
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
              className={`pb-1 text-[11px] font-semibold ${
                i === 0 ? "text-red-400/80" : "text-ink-faint"
              }`}
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
            return (
              <button
                key={k}
                onClick={() => hasMeeting && openDay(k)}
                disabled={!hasMeeting}
                className={`relative mx-auto flex h-9 w-9 flex-col items-center justify-center rounded-xl text-sm transition-all ${
                  hasMeeting
                    ? "cursor-pointer border border-gold/40 bg-gold/10 font-bold text-gold-ink hover:bg-gold/20"
                    : "text-ink-soft"
                } ${isToday ? "ring-2 ring-teal/45" : ""}`}
              >
                {day}
                {hasMeeting && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-gold" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 날짜 클릭 모달 */}
      {selectedKey && selectedMeetings.length > 0 && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/25 px-4 backdrop-blur-[2px]"
          onClick={closeModal}
        >
          <div
            className="glass-card max-h-[80vh] w-full max-w-sm overflow-y-auto p-6"
            style={{ background: "rgba(255,255,255,.94)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold text-ink">
                {fmtDateShort(selectedMeetings[0].meetsAt)} 모임
              </p>
              <button
                onClick={closeModal}
                className="text-ink-faint transition-colors hover:text-ink"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {selectedMeetings.map((m) => (
                <div key={m.id} className="glass-soft rounded-xl p-4">
                  <p className="mb-2 font-bold text-ink">{m.title}</p>
                  <dl className="space-y-1.5 text-sm">
                    <MeetingRow icon="🕐" label="시간" value={fmtTime(m.meetsAt)} />
                    <MeetingRow icon="📍" label="장소" value={m.place} />
                    {m.items && <MeetingRow icon="🎒" label="준비물" value={m.items} />}
                    {m.fee && <MeetingRow icon="💰" label="회비" value={m.fee} />}
                  </dl>
                  {m.note && (
                    <p className="mt-2.5 whitespace-pre-wrap border-t border-sky-line pt-2.5 text-xs leading-relaxed text-ink-soft">
                      {m.note}
                    </p>
                  )}
                  {isOwner &&
                    (deletingId === m.id ? (
                      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                        <span className="text-ink-soft">공지를 삭제할까요?</span>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleDelete(m)}
                            className="font-semibold text-red-500 transition-colors hover:text-red-400"
                          >
                            예
                          </button>
                          <button
                            onClick={() => {
                              setDeletingId(null);
                              setDeleteError(null);
                            }}
                            className="text-ink-faint transition-colors hover:text-ink"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => openEditForm(m)}
                          className="flex-1 rounded-lg border border-white/95 bg-white/70 px-3 py-1.5 text-xs font-medium text-ink-soft transition-all hover:text-ink"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => setDeletingId(m.id)}
                          className="flex-1 rounded-lg border border-red-300/50 bg-red-500/[0.06] px-3 py-1.5 text-xs font-medium text-red-500 transition-all hover:bg-red-500/10"
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  {deletingId === m.id && deleteError && (
                    <p className="mt-2 text-xs text-red-500">{deleteError}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MeetingRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-ink-faint">
        {icon} {label}
      </dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}
