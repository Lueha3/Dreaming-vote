"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { safeJson } from "@/lib/http";

type Props = {
  recruitmentId: string;
};

type Step = "idle" | "identify" | "applying";

// 409 Conflict 에러 코드에 대한 사용자 친화적 메시지 매핑
function getConflictMessage(code: string | undefined): string {
  switch (code) {
    case "ALREADY_APPLIED":
      return "이미 신청한 모집입니다.";
    case "CAPACITY_FULL":
      return "정원이 꽉 찼습니다.";
    case "RECRUITMENT_CLOSED":
      return "모집이 마감되었습니다.";
    default:
      return "신청할 수 없습니다.";
  }
}

export function ApplyButton({ recruitmentId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [churchCode, setChurchCode] = useState("");
  const [name, setName] = useState("");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApplied, setIsApplied] = useState(false);

  const resetMessage = () => setMessage(null);

  async function handleApply() {
    if (isSubmitting) return; // 중복 클릭 방지

    resetMessage();
    setStep("applying");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recruitmentId }),
      });

      if (res.status === 401) {
        // identify 필요
        setStep("identify");
        setIsSubmitting(false);
        return;
      }

      const data = await safeJson<any>(res);

      // 409 Conflict는 비즈니스 규칙이므로 정상적인 응답으로 처리
      if (res.status === 409) {
        const userMessage = getConflictMessage(data?.code);
        setMessage(userMessage);
        setStep("idle");
        setIsSubmitting(false);
        return;
      }

      // 409가 아닌 다른 에러는 실제 에러로 처리
      if (!res.ok || data?.ok === false) {
        setMessage(data?.error ?? "신청에 실패했습니다.");
        setStep("idle");
        setIsSubmitting(false);
        return;
      }

      // 성공
      setMessage("신청이 완료되었습니다.");
      setStep("idle");
      setIsSubmitting(false);
    } catch (e) {
      console.error("Apply error:", e);
      setMessage("신청 중 오류가 발생했습니다.");
      setStep("idle");
      setIsSubmitting(false);
    }
  }

  async function handleIdentifyAndApply(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return; // 중복 클릭 방지

    resetMessage();

    if (!churchCode || !name || !phoneLast4) {
      setMessage("교회코드, 이름, 폰 뒤 4자리를 모두 입력해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const identifyRes = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          churchCode: churchCode.trim(),
          name: name.trim(),
          phoneLast4: phoneLast4.trim(),
        }),
      });

      const identifyData = await safeJson<any>(identifyRes);

      if (!identifyRes.ok || identifyData?.ok === false) {
        setMessage(identifyData?.error ?? "본인 확인에 실패했습니다.");
        setIsSubmitting(false);
        return;
      }

      // identify 성공 후 다시 신청 시도
      setStep("applying");

      const applyRes = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recruitmentId }),
      });

      const applyData = await safeJson<any>(applyRes);

      // 409 Conflict는 비즈니스 규칙이므로 정상적인 응답으로 처리
      if (applyRes.status === 409) {
        const userMessage = getConflictMessage(applyData?.code);
        setMessage(userMessage);
        setStep("idle");
        setIsSubmitting(false);
        return;
      }

      // 409가 아닌 다른 에러는 실제 에러로 처리
      if (!applyRes.ok || applyData?.ok === false) {
        setMessage(applyData?.error ?? "신청에 실패했습니다.");
        setStep("idle");
        setIsSubmitting(false);
        return;
      }

      // 성공
      setMessage("신청이 완료되었습니다.");
      setIsApplied(true);
      setStep("idle");
      setIsSubmitting(false);
      // 페이지 새로고침하여 appliedCount 업데이트
      router.refresh();
    } catch (e) {
      console.error("Identify and apply error:", e);
      setMessage("요청 처리 중 오류가 발생했습니다.");
      setStep("idle");
      setIsSubmitting(false);
    }
  }

  const isApplying = step === "applying";
  const showModal = step === "identify";
  const isDisabled = isApplying || isSubmitting || isApplied;

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={handleApply}
        disabled={isDisabled}
        className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700 disabled:opacity-60"
      >
        {isApplied
          ? "신청 완료"
          : isApplying || isSubmitting
            ? "신청 중..."
            : "신청하기"}
      </button>

      {message && (
        <p className="mt-2 text-sm text-zinc-700">
          {message}
        </p>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold">본인 확인</h2>
            <p className="mb-4 text-sm text-zinc-600">
              교회코드, 이름, 휴대폰 번호 뒤 4자리를 입력하면 신청을 진행합니다.
            </p>
            <form onSubmit={handleIdentifyAndApply} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">
                  교회코드
                </label>
                <input
                  type="text"
                  value={churchCode}
                  onChange={(e) => setChurchCode(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="예: ABC123"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">
                  이름
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="이름"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">
                  휴대폰 번호 뒤 4자리
                </label>
                <input
                  type="tel"
                  value={phoneLast4}
                  onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, ""))}
                  maxLength={4}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="1234"
                />
              </div>

              {message && (
                <p className="text-sm text-red-600">
                  {message}
                </p>
              )}

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep("idle");
                    resetMessage();
                  }}
                  className="rounded-md border px-3 py-1.5 text-sm"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  확인 후 신청
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
