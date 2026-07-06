"use client";

import { useEffect, useState } from "react";

type Item = {
  id: string;
  weekOf: string;
  question: string;
  createdByNickname: string | null;
  answerCount: number;
};

function fmtWeek(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  });
}

export default function ManageIcebreakerPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [thisWeek, setThisWeek] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/manage/icebreaker", { cache: "no-store" });
      const j = await r.json();
      if (j.ok) {
        setItems(j.items);
        setThisWeek(j.thisWeek);
        const current = j.items.find((i: Item) => i.weekOf === j.thisWeek);
        setDraft(current?.question ?? "");
      } else setErr(j.error ?? "불러오지 못했어요.");
    } catch {
      setErr("불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!draft.trim()) {
      setErr("질문을 입력해주세요.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/manage/icebreaker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: draft.trim() }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        setErr(j.error ?? "저장에 실패했어요.");
        return;
      }
      await load();
    } catch {
      setErr("저장에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-ink-soft">불러오는 중…</p>;

  const currentItem = items.find((i) => i.weekOf === thisWeek);

  return (
    <div>
      <p className="mb-4 text-sm text-ink-soft">
        이번 주 광장 상단에 고정될 질문을 설정해요. 설정하지 않으면 매주 월요일 새벽 자동으로
        프리셋 질문이 채워져요.
      </p>

      {err && (
        <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
          {err}
        </div>
      )}

      <div className="glass-card mb-5 space-y-3 p-4">
        <div className="text-sm font-semibold text-ink">
          이번 주 질문 {currentItem && <span className="text-ink-faint">(답변 {currentItem.answerCount}개)</span>}
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="예: 요즘 나를 웃게 만든 순간은?"
          rows={2}
          maxLength={200}
          className="w-full resize-y rounded-xl border border-sky-line bg-white/70 px-3.5 py-2.5 text-sm leading-relaxed text-ink placeholder-ink-faint focus:border-skyx/50 focus:outline-none"
        />
        <div className="flex justify-end">
          <button
            onClick={save}
            disabled={busy}
            className="btn-gold rounded-full px-5 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            {busy ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>

      <div className="mb-2 text-xs font-medium text-ink-soft">지난 질문</div>
      {items.length === 0 ? (
        <div className="glass-card px-6 py-12 text-center text-sm text-ink-soft">
          아직 질문 기록이 없어요.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.id} className="glass-card p-3.5">
              <div className="mb-1 flex items-center gap-2 text-[11px] text-ink-faint">
                <span>{fmtWeek(i.weekOf)} 주</span>
                <span>·</span>
                <span>{i.createdByNickname ?? "자동 선택"}</span>
                <span>·</span>
                <span>답변 {i.answerCount}개</span>
              </div>
              <p className="text-sm text-ink">{i.question}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
