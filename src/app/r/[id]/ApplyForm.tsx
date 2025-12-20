"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { safeJson } from "@/lib/http";
import { setSavedContact } from "@/lib/contactStorage";

type Props = {
  recruitmentId: string;
  initialAppliedCount?: number;
  onAppliedCountChange?: (newCount: number) => void;
  onSuccess?: () => void;
};

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

type Status = "idle" | "submitting" | "success" | "error";

export function ApplyForm({
  recruitmentId,
  initialAppliedCount,
  onAppliedCountChange,
  onSuccess,
}: Props) {
  const router = useRouter();
  const [contact, setContact] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (status === "submitting" || status === "success") return;

    setStatus("submitting");
    setErrorMessage(null);
    setFieldErrors({});

    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recruitmentId,
          contact: contact.trim(),
          name: name.trim() || undefined,
          message: message.trim() || undefined,
        }),
      });

      const data = await safeJson<any>(res);

      // 409 Conflict는 비즈니스 규칙이므로 정상적인 응답으로 처리
      if (res.status === 409) {
        const userMessage = getConflictMessage(data?.code) || data?.error || "신청할 수 없습니다.";
        setStatus("error");
        setErrorMessage(userMessage);
        return;
      }

      // 400 Bad Request: 필드 에러 표시
      if (res.status === 400) {
        setStatus("error");
        if (data?.fieldErrors) {
          setFieldErrors(data.fieldErrors);
        }
        setErrorMessage(data?.error || "입력값을 확인해주세요.");
        return;
      }

      // 기타 에러 (500/network)
      if (!res.ok || data?.ok === false) {
        setStatus("error");
        setErrorMessage("일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        console.debug("Apply error:", { status: res.status, data });
        return;
      }

      // 성공 (200 OK)
      setStatus("success");
      
      // Contact 저장 (정규화된 값 사용)
      if (data?.application?.contact) {
        setSavedContact(data.application.contact);
      }
      
      // Optimistic update: appliedCount + 1
      if (initialAppliedCount !== undefined && onAppliedCountChange) {
        onAppliedCountChange(initialAppliedCount + 1);
      }
      
      // 성공 콜백 호출 (myApplication 다시 로드)
      if (onSuccess) {
        onSuccess();
      }
      
      // 페이지 새로고침하여 서버 상태 동기화 (백그라운드)
      router.refresh();
    } catch (e) {
      // Network errors or JSON parsing errors
      setStatus("error");
      setErrorMessage("일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      console.debug("Apply network error:", e);
    }
  }

  const isSubmitting = status === "submitting";
  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-lg border bg-white px-4 py-4">
      <h3 className="text-base font-semibold">신청하기</h3>

      {isSuccess && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          신청이 완료되었습니다.
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">
          이메일 또는 휴대폰 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          onBlur={(e) => {
            const value = e.target.value.trim();
            // 전화번호인 경우 (이메일이 아닌 경우) 숫자만 남기기
            if (value && !value.includes("@")) {
              const cleaned = value.replace(/\D/g, "");
              if (cleaned !== value) {
                setContact(cleaned);
              }
            }
          }}
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="example@email.com 또는 01012345678"
          required
          disabled={isSubmitting || isSuccess}
        />
        {fieldErrors.contact && (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.contact[0]}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">
          이름 (선택사항)
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="이름"
          disabled={isSubmitting || isSuccess}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">
          한 줄 소개 (선택사항)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="간단한 자기소개를 입력해주세요"
          disabled={isSubmitting || isSuccess}
        />
      </div>

      {isError && errorMessage && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting || isSuccess}
        className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSuccess
          ? "신청 완료"
          : isSubmitting
            ? "신청 중..."
            : "신청하기"}
      </button>
    </form>
  );
}

