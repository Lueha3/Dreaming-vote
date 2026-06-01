"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * 비로그인 파싱 후 로그인 콜백 도착 페이지
 * sessionStorage의 임시 리포트 데이터를 /api/reports/save로 전송
 */
export default function PendingReportPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"saving" | "error">("saving");
  const [errorMsg, setErrorMsg] = useState("");

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
        setErrorMsg(e.message ?? "오류가 발생했습니다.");
      });
  }, [router]);

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{errorMsg}</p>
          <a href="/" className="mt-4 inline-block text-sm text-blue-600 underline">
            처음으로
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center text-zinc-600">
        <div className="mb-3 text-2xl">⚡</div>
        <p className="text-sm">리포트를 저장하는 중...</p>
      </div>
    </div>
  );
}
