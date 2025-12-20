"use client";

import { useState } from "react";

import { safeJson } from "@/lib/http";
import { clearSavedContact } from "@/lib/contactStorage";

type ApplicationItem = {
  id: string;
  recruitmentId: string;
  contact: string;
  name: string | null;
  message: string | null;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  application: ApplicationItem;
  initialAppliedCount: number;
  onAppliedCountChange: (newCount: number) => void;
  onApplicationRemoved: () => void;
};

/**
 * 전화번호 마스킹 (예: 01012345678 -> 010****5678)
 */
function maskPhone(phone: string): string {
  if (phone.length <= 7) {
    return phone;
  }
  const start = phone.slice(0, 3);
  const end = phone.slice(-4);
  return `${start}****${end}`;
}

/**
 * Contact 표시 (이메일은 그대로, 전화번호는 마스킹)
 */
function formatContact(contact: string): string {
  if (contact.includes("@")) {
    return contact;
  }
  return maskPhone(contact);
}

export function MyApplicationCard({
  application,
  initialAppliedCount,
  onAppliedCountChange,
  onApplicationRemoved,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(application.name || "");
  const [message, setMessage] = useState(application.message || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function handleSave() {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setAlert(null);

    try {
      const res = await fetch(`/api/my-application/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact: application.contact,
          name: name.trim() || undefined,
          message: message.trim() || undefined,
        }),
      });

      const data = await safeJson<any>(res);

      if (!res.ok || data?.ok === false) {
        setAlert({
          type: "error",
          message: data?.error ?? "수정에 실패했습니다.",
        });
        setIsSubmitting(false);
        return;
      }

      setAlert({
        type: "success",
        message: "수정 완료",
      });
      setIsEditing(false);
      setIsSubmitting(false);

      // 성공 후 잠시 후 알림 제거
      setTimeout(() => setAlert(null), 3000);
    } catch (e) {
      setAlert({
        type: "error",
        message: "수정 중 오류가 발생했습니다.",
      });
      setIsSubmitting(false);
    }
  }

  async function handleCancel() {
    if (isSubmitting) return;

    const confirmed = window.confirm("정말 신청을 취소하시겠습니까?");
    if (!confirmed) return;

    setIsSubmitting(true);
    setAlert(null);

    try {
      const res = await fetch(`/api/my-application/${application.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact: application.contact,
        }),
      });

      const data = await safeJson<any>(res);

      if (!res.ok || data?.ok === false) {
        setAlert({
          type: "error",
          message: data?.error ?? "취소에 실패했습니다.",
        });
        setIsSubmitting(false);
        return;
      }

      // appliedCount 감소
      if (initialAppliedCount > 0) {
        onAppliedCountChange(initialAppliedCount - 1);
      }

      // 신청 정보 제거 콜백 호출
      onApplicationRemoved();
    } catch (e) {
      setAlert({
        type: "error",
        message: "취소 중 오류가 발생했습니다.",
      });
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-6 space-y-4 rounded-lg border bg-white px-4 py-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">내 신청 정보</h3>
        {!isEditing && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              disabled={isSubmitting}
              className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60"
            >
              수정
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              취소
            </button>
          </div>
        )}
      </div>

      {alert && (
        <div
          className={`rounded-md px-3 py-2 text-sm ${
            alert.type === "success"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {alert.message}
        </div>
      )}

      <div className="space-y-3 text-sm">
        <div>
          <span className="font-medium text-zinc-700">연락처:</span>{" "}
          <span className="text-zinc-600">{formatContact(application.contact)}</span>
        </div>

        {isEditing ? (
          <>
            <div>
              <label className="mb-1 block font-medium text-zinc-700">이름 (선택사항)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="이름"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-zinc-700">한 줄 소개 (선택사항)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="간단한 자기소개를 입력해주세요"
                disabled={isSubmitting}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setName(application.name || "");
                  setMessage(application.message || "");
                  setAlert(null);
                }}
                disabled={isSubmitting}
                className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {isSubmitting ? "저장 중..." : "저장"}
              </button>
            </div>
          </>
        ) : (
          <>
            {application.name && (
              <div>
                <span className="font-medium text-zinc-700">이름:</span>{" "}
                <span className="text-zinc-600">{application.name}</span>
              </div>
            )}
            {application.message && (
              <div>
                <span className="font-medium text-zinc-700">한 줄 소개:</span>{" "}
                <span className="text-zinc-600">{application.message}</span>
              </div>
            )}
            <div className="text-xs text-zinc-500">
              신청일:{" "}
              {new Date(application.createdAt).toLocaleString("ko-KR", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

