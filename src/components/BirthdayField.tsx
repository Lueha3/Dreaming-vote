"use client";

import { useState } from "react";
import { fetchJson } from "@/lib/http";

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** 생일(월·일만, 연도 미저장) 등록 — 등록하면 그날 광장에 축하 카드가 자동으로 올라간다. */
export function BirthdayField({
  initialMonth,
  initialDay,
}: {
  initialMonth: number | null;
  initialDay: number | null;
}) {
  const [month, setMonth] = useState<number | "">(initialMonth ?? "");
  const [day, setDay] = useState<number | "">(initialDay ?? "");
  const [saved, setSaved] = useState(initialMonth != null && initialDay != null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxDay = month ? DAYS_IN_MONTH[Number(month) - 1] : 31;

  async function save() {
    if (!month || !day) return;
    setSaving(true);
    setError(null);
    try {
      await fetchJson("/api/my/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthMonth: Number(month), birthDay: Number(day) }),
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했어요.");
    }
    setSaving(false);
  }

  return (
    <div className="glass-card p-5">
      <p className="mb-1.5 text-xs font-semibold text-ink">🎂 생일</p>
      <p className="mb-3 text-xs leading-relaxed text-ink-soft">
        {saved
          ? "생일 당일 광장에 축하 카드가 자동으로 올라가요."
          : "등록하면 생일 당일 광장에서 축하받을 수 있어요. 연도는 받지 않아요."}
      </p>
      <div className="flex items-center gap-2">
        <select
          value={month}
          onChange={(e) => {
            setMonth(e.target.value ? Number(e.target.value) : "");
            setSaved(false);
          }}
          className="rounded-xl border border-white/95 bg-white/70 px-3 py-2 text-sm text-ink focus:border-teal focus:outline-none"
        >
          <option value="">월</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {m}월
            </option>
          ))}
        </select>
        <select
          value={day}
          onChange={(e) => {
            setDay(e.target.value ? Number(e.target.value) : "");
            setSaved(false);
          }}
          className="rounded-xl border border-white/95 bg-white/70 px-3 py-2 text-sm text-ink focus:border-teal focus:outline-none"
        >
          <option value="">일</option>
          {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              {d}일
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={save}
          disabled={!month || !day || saving || saved}
          className="btn-gold rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-40"
        >
          {saving ? "저장 중..." : saved ? "저장됨" : "저장"}
        </button>
      </div>
      {error && <p className="mt-2 text-[11px] text-red-500">{error}</p>}
    </div>
  );
}
