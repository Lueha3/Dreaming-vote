"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function PendingReportPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"saving" | "error">("saving");
  const [errorMsg, setErrorMsg] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const raw = sessionStorage.getItem("bh_pending_report");
    if (!raw) {
      router.replace("/");
      return;
    }

    const pendingData = JSON.parse(raw);

    fetch("/api/reports/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pendingData),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.shareSlug) {
          sessionStorage.removeItem("bh_pending_report");
          router.replace(`/report/${data.shareSlug}`);
        } else {
          throw new Error(data.error ?? "저장 실패");
        }
      })
      .catch((e) => {
        setStatus("error");
        setErrorMsg(e instanceof Error ? e.message : "오류가 발생했습니다.");
      });
  }, [router, retryCount]);

  if (status === "error") {
    return (
      <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
        <div className="relative text-center px-6">
          <div className="mb-5 text-4xl">⚠️</div>
          <h2 className="mb-2 text-xl font-bold text-ink">저장에 실패했어요</h2>
          <p className="mb-2 text-sm text-ink-soft">{errorMsg}</p>
          <p className="mb-8 text-xs text-ink-faint">
            결과는 안전해요 — 다시 시도하면 저장됩니다.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => { setStatus("saving"); setRetryCount((c) => c + 1); }}
              className="btn-gold rounded-full px-6 py-2.5 text-sm"
            >
              다시 저장하기
            </button>
            <Link
              href="/"
              className="glass-soft rounded-full px-6 py-2.5 text-sm font-medium text-ink-soft transition-all hover:bg-white/90 hover:text-ink"
            >
              처음으로
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
      <div className="relative text-center">
        <div className="relative mx-auto mb-6 h-12 w-12">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-teal/25 border-t-teal-deep" />
          <div className="absolute inset-0 rounded-full bg-teal/15 blur-lg" />
        </div>
        <p className="text-sm text-ink-soft">성향 카드를 저장하는 중...</p>
      </div>
    </div>
  );
}
