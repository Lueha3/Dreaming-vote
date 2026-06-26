"use client";

import { useEffect, useState } from "react";

type Announcement = {
  id: string;
  title: string;
  body: string;
  isPublished: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  authorNickname: string | null;
};

type Draft = {
  title: string;
  body: string;
  isPublished: boolean;
  isPinned: boolean;
  broadcast: boolean;
};

const EMPTY_DRAFT: Draft = {
  title: "",
  body: "",
  isPublished: true,
  isPinned: false,
  broadcast: false,
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul", // 공개 /notices와 표시 일치 — 관리자 기기 TZ 무관하게 KST
  });
}

export default function ManageAnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // editing: null=폼 닫힘, "new"=신규, 그 외=해당 공지 수정
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/manage/announcements", { cache: "no-store" });
      const j = await r.json();
      if (j.ok) setItems(j.items);
      else setErr(j.error ?? "불러오지 못했어요.");
    } catch {
      setErr("불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }

  function startNew() {
    setErr(null);
    setDraft(EMPTY_DRAFT);
    setEditing("new");
  }

  function startEdit(a: Announcement) {
    setErr(null);
    setDraft({
      title: a.title,
      body: a.body,
      isPublished: a.isPublished,
      isPinned: a.isPinned,
      broadcast: false, // 브로드캐스트는 신규 작성에서만 — 수정 시엔 항상 false
    });
    setEditing(a.id);
  }

  function cancel() {
    setEditing(null);
    setDraft(EMPTY_DRAFT);
    setErr(null);
  }

  async function save() {
    if (!draft.title.trim() || !draft.body.trim()) {
      setErr("제목과 내용을 모두 입력해주세요.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const isNew = editing === "new";
      const res = await fetch(
        isNew ? "/api/manage/announcements" : `/api/manage/announcements/${editing}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        },
      );
      const j = await res.json();
      if (!res.ok || !j.ok) {
        setErr(j.error ?? "저장에 실패했어요.");
        return;
      }
      cancel();
      await load();
    } catch {
      setErr("저장에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function patch(a: Announcement, data: Partial<Pick<Announcement, "isPublished" | "isPinned">>) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/manage/announcements/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        setErr(j.error ?? "변경에 실패했어요.");
        return;
      }
      await load();
    } catch {
      setErr("변경에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(a: Announcement) {
    if (!confirm("이 공지를 삭제할까요? 되돌릴 수 없어요.")) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/manage/announcements/${a.id}`, { method: "DELETE" });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        setErr(j.error ?? "삭제에 실패했어요.");
        return;
      }
      if (editing === a.id) cancel();
      await load();
    } catch {
      setErr("삭제에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-ink-soft">불러오는 중…</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          전체 공개 공지를 작성·관리합니다. 게시 중인 공지는 홈 배너와{" "}
          <span className="font-medium text-ink">공지 페이지</span>에 노출돼요.
        </p>
        {editing === null && (
          <button
            onClick={startNew}
            className="btn-gold shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium"
          >
            + 새 공지
          </button>
        )}
      </div>

      {err && (
        <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
          {err}
        </div>
      )}

      {/* 작성·수정 폼 */}
      {editing !== null && (
        <div className="glass-card mb-5 space-y-3 p-4">
          <div className="text-sm font-semibold text-ink">
            {editing === "new" ? "새 공지 작성" : "공지 수정"}
          </div>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="제목"
            maxLength={120}
            className="w-full rounded-xl border border-sky-line bg-white/70 px-3.5 py-2.5 text-sm text-ink placeholder-ink-faint focus:border-skyx/50 focus:outline-none"
          />
          <textarea
            value={draft.body}
            onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
            placeholder="내용"
            rows={5}
            maxLength={5000}
            className="w-full resize-y rounded-xl border border-sky-line bg-white/70 px-3.5 py-2.5 text-sm leading-relaxed text-ink placeholder-ink-faint focus:border-skyx/50 focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  isPublished: !d.isPublished,
                  // 초안으로 내리면 브로드캐스트는 불가 → 함께 해제.
                  broadcast: !d.isPublished ? d.broadcast : false,
                }))
              }
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                draft.isPublished
                  ? "border-teal/40 bg-teal/10 text-teal-ink"
                  : "glass-soft text-ink-soft"
              }`}
            >
              {draft.isPublished ? "게시함" : "초안(비공개)"}
            </button>
            <button
              type="button"
              onClick={() => setDraft((d) => ({ ...d, isPinned: !d.isPinned }))}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                draft.isPinned
                  ? "border-gold/40 bg-gold/10 text-gold-ink"
                  : "glass-soft text-ink-soft"
              }`}
            >
              📌 {draft.isPinned ? "상단 고정" : "고정 안 함"}
            </button>
            {/* 브로드캐스트는 신규 게시 공지에서만 — 멤버 전원에게 인앱 알림 발송 */}
            {editing === "new" && draft.isPublished && (
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, broadcast: !d.broadcast }))}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                  draft.broadcast
                    ? "border-skyx/40 bg-skyx/10 text-skyx-ink"
                    : "glass-soft text-ink-soft"
                }`}
              >
                🔔 {draft.broadcast ? "알림 발송함" : "알림으로도 보내기"}
              </button>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={cancel}
              disabled={busy}
              className="glass-soft rounded-full px-4 py-1.5 text-xs text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={save}
              disabled={busy}
              className="btn-gold rounded-full px-5 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              {busy ? "저장 중…" : "저장"}
            </button>
          </div>
        </div>
      )}

      {/* 목록 */}
      {items.length === 0 ? (
        <div className="glass-card px-6 py-12 text-center text-sm text-ink-soft">
          아직 작성된 공지가 없어요.
        </div>
      ) : (
        <ul className="space-y-2.5">
          {items.map((a) => (
            <li key={a.id} className="glass-card p-4">
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                {a.isPinned && (
                  <span className="rounded-full border border-gold/35 bg-gold/10 px-2 py-0.5 text-[10px] font-medium text-gold-ink">
                    📌 고정
                  </span>
                )}
                {a.isPublished ? (
                  <span className="rounded-full border border-teal/35 bg-teal/10 px-2 py-0.5 text-[10px] font-medium text-teal-ink">
                    게시 중
                  </span>
                ) : (
                  <span className="glass-soft rounded-full px-2 py-0.5 text-[10px] font-medium text-ink-faint">
                    초안
                  </span>
                )}
                <span className="truncate text-sm font-semibold text-ink">{a.title}</span>
              </div>
              <p className="mb-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-soft line-clamp-3">
                {a.body}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-ink-faint">
                  {a.authorNickname ?? "운영팀"} · {fmtDate(a.createdAt)}
                </span>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => patch(a, { isPinned: !a.isPinned })}
                    disabled={busy}
                    className="glass-soft rounded-full px-2.5 py-1 text-[11px] text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
                  >
                    {a.isPinned ? "고정해제" : "고정"}
                  </button>
                  <button
                    onClick={() => patch(a, { isPublished: !a.isPublished })}
                    disabled={busy}
                    className="glass-soft rounded-full px-2.5 py-1 text-[11px] text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
                  >
                    {a.isPublished ? "게시중지" : "게시"}
                  </button>
                  <button
                    onClick={() => startEdit(a)}
                    disabled={busy}
                    className="glass-soft rounded-full px-2.5 py-1 text-[11px] text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => remove(a)}
                    disabled={busy}
                    className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
