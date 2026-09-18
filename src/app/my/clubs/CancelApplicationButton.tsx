"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchJson } from "@/lib/http";

/** 대기 중인 가입 신청 취소 — 확인 후 DELETE /api/clubs/[id]/apply. */
export function CancelApplicationButton({ clubId, clubName }: { clubId: string; clubName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      await fetchJson(`/api/clubs/${clubId}/apply`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "취소에 실패했어요.");
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-xs font-medium text-ink-faint transition-colors hover:text-red-500"
      >
        신청 취소
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <span className="text-xs text-ink-soft">‘{clubName}’ 신청을 취소할까요?</span>
      <button
        onClick={cancel}
        disabled={busy}
        className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 transition-all hover:bg-red-100 disabled:opacity-50"
      >
        {busy ? "처리 중…" : "신청 취소"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="glass-soft rounded-lg px-2.5 py-1 text-xs text-ink-soft hover:text-ink"
      >
        취소
      </button>
      {error && <span className="w-full text-right text-xs text-red-500">{error}</span>}
    </div>
  );
}
