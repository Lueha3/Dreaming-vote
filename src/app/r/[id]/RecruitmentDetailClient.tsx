"use client";

import { useState } from "react";

import { fetchJson } from "@/lib/http";

import { ApplyForm } from "./ApplyForm";

type Recruitment = {
  id: string;
  title: string;
  content: string;
  capacity: number;
  appliedCount: number;
  status: string;
};

type Props = {
  initialRecruitment: Recruitment;
};

export function RecruitmentDetailClient({ initialRecruitment }: Props) {
  const [recruitment, setRecruitment] = useState(initialRecruitment);

  function handleAppliedCountChange(newCount: number) {
    setRecruitment((prev) => ({
      ...prev,
      appliedCount: newCount,
    }));
  }

  return (
    <>
      <h1 className="mb-2 text-2xl font-bold">
        {recruitment.title ?? "(untitled)"}
      </h1>
      <div className="mb-4 flex items-center gap-3 text-sm text-zinc-600">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            recruitment.status === "open"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-zinc-100 text-zinc-500"
          }`}
        >
          {recruitment.status === "open" ? "모집중" : "마감"}
        </span>
        <span>
          정원 {recruitment.capacity ?? 0}명 / 신청 {recruitment.appliedCount ?? 0}명
        </span>
      </div>

      <article className="whitespace-pre-wrap rounded-lg border bg-white px-4 py-4 text-sm leading-relaxed text-zinc-800">
        {recruitment.content ?? ""}
      </article>

      {recruitment.status === "open" ? (
        <ApplyForm
          recruitmentId={recruitment.id}
          initialAppliedCount={recruitment.appliedCount}
          onAppliedCountChange={handleAppliedCountChange}
        />
      ) : (
        <p className="mt-6 text-sm text-red-600">이미 마감된 모집입니다.</p>
      )}
    </>
  );
}

