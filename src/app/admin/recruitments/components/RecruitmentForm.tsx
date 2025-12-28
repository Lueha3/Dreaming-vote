"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { fetchJson } from "@/lib/http";

type RecruitmentFormProps = {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    title: string;
    content: string;
    capacity: number;
    status: string;
  };
};

export function RecruitmentForm({ mode, initialData }: RecruitmentFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.content ?? "");
  const [capacity, setCapacity] = useState(
    initialData?.capacity?.toString() ?? "",
  );
  const [status, setStatus] = useState(initialData?.status ?? "open");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isSubmitting) return;

    if (!title.trim() || !description.trim() || !capacity.trim()) {
      setMessage({ type: "error", text: "모든 필드를 입력해주세요." });
      return;
    }

    const capacityNum = parseInt(capacity, 10);
    if (isNaN(capacityNum) || capacityNum <= 0) {
      setMessage({ type: "error", text: "정원은 1 이상의 숫자여야 합니다." });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      if (mode === "create") {
        await fetchJson<{
          ok: true;
          item: { id: string; title: string };
        }>("/api/admin/recruitments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            capacity: capacityNum,
          }),
        });
      } else {
        await fetchJson<{
          ok: true;
          item: { id: string; title: string };
        }>(`/api/admin/recruitments/${initialData!.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: title.trim(),
            content: description.trim(),
            capacity: capacityNum,
            status,
          }),
        });
      }

      // 성공 시 모집글 목록으로 리다이렉트
      router.push("/admin/recruitments");
    } catch (e: unknown) {
      const errorMessage =
        e instanceof Error ? e.message : "모집글 저장에 실패했습니다.";
      setMessage({
        type: "error",
        text: errorMessage,
      });
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">
          제목
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="예: 찬양팀 모집"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">
          설명
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="모집 내용을 입력하세요..."
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">
          정원
        </label>
        <input
          type="number"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          min="1"
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="예: 10"
          required
        />
      </div>

      {mode === "edit" && (
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            상태
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="open">모집중</option>
            <option value="closed">마감</option>
          </select>
        </div>
      )}

      {message && (
        <div
          className={`rounded-md px-3 py-2 text-sm ${
            message.type === "error"
              ? "bg-red-50 text-red-700"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border px-4 py-2 text-sm"
          disabled={isSubmitting}
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {isSubmitting
            ? mode === "create"
              ? "생성 중..."
              : "저장 중..."
            : mode === "create"
              ? "생성하기"
              : "저장하기"}
        </button>
      </div>
    </form>
  );
}

