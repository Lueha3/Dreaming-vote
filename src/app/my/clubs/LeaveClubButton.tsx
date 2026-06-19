"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchJson } from "@/lib/http";

/** 가입한 동아리에서 나가기 — 확인 후 POST /api/clubs/[id]/leave. */
export function LeaveClubButton({ clubId, clubName }: { clubId: string; clubName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function leave() {
    setBusy(true);
    setError(null);
    try {
      await fetchJson(`/api/clubs/${clubId}/leave`, { method: "POST" });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "나가기에 실패했어요.");
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-xs font-medium text-ink-faint transition-colors hover:text-red-500"
      >
        나가기
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <span className="text-xs text-ink-soft">‘{clubName}’에서 나갈까요?</span>
      <button
        onClick={leave}
        disabled={busy}
        className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 transition-all hover:bg-red-100 disabled:opacity-50"
      >
        {busy ? "처리 중…" : "나가기"}
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
