"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/http";

type Summary = {
  membershipStatus: "none" | "pending" | "approved" | "rejected";
  privacyAgreedAt: string | null;
};

/**
 * 개인정보처리방침 소급 동의 안내 — 방침 도입 이전에 이미 가입 신청서를 제출한
 * (pending/approved/rejected) 회원에게 앱 진입 시 1회 동의를 받는 차단형 모달.
 * /join의 체크박스는 신규 신청자만 커버하므로, 기존 신청자는 이걸로 보완한다.
 * 법적 동의이므로 AutoPushPrompt와 달리 "나중에" 없이 동의해야 닫힌다.
 */
export function PrivacyConsentPrompt() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [agreeing, setAgreeing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!/sb-[a-z0-9-]+-auth-token/i.test(document.cookie)) return;
    fetch("/api/membership?fields=summary", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.ok) setSummary(j.membership);
      })
      .catch(() => {});
  }, []);

  if (!summary || summary.membershipStatus === "none" || summary.privacyAgreedAt) return null;

  async function agree() {
    setAgreeing(true);
    setError(null);
    try {
      await fetchJson("/api/my/privacy-consent", { method: "POST" });
      setSummary((s) => (s ? { ...s, privacyAgreedAt: new Date().toISOString() } : s));
    } catch {
      setError("처리에 실패했어요. 잠시 후 다시 시도해주세요.");
    }
    setAgreeing(false);
  }

  return (
    <div className="modal-fade-in fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4 backdrop-blur-[2px]">
      <div className="modal-pop-in glass-card w-full max-w-sm p-6 text-center">
        <div className="mb-3 text-3xl">🔒</div>
        <p className="mb-1.5 text-sm font-bold text-ink">개인정보처리방침 안내</p>
        <p className="mb-5 text-xs leading-relaxed text-ink-soft">
          가입 신청·멤버 확인을 위해 수집한 개인정보 처리 내용을 안내드려요.
          <br />
          계속 이용하시려면 아래 방침에 동의해주세요.
        </p>
        <Link
          href="/privacy"
          target="_blank"
          className="mb-4 inline-block text-xs font-semibold text-teal-ink underline underline-offset-2"
        >
          개인정보처리방침 전문 보기
        </Link>
        {error && <p className="mb-3 text-[11px] text-red-500">{error}</p>}
        <button
          type="button"
          onClick={agree}
          disabled={agreeing}
          className="btn-gold w-full rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40 btn-glow"
        >
          {agreeing ? "처리 중..." : "확인했어요, 동의합니다"}
        </button>
      </div>
    </div>
  );
}
