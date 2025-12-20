"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { fetchJson } from "@/lib/http";
import { getSavedContact } from "@/lib/contactStorage";

import { ApplyForm } from "./ApplyForm";
import { MyApplicationCard } from "./MyApplicationCard";

type Recruitment = {
  id: string;
  title: string;
  content: string;
  capacity: number;
  appliedCount: number;
  status: string;
};

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
  initialRecruitment: Recruitment;
};

export function RecruitmentDetailClient({ initialRecruitment }: Props) {
  const router = useRouter();
  const [recruitment, setRecruitment] = useState(initialRecruitment);
  const [myApplication, setMyApplication] = useState<ApplicationItem | null>(null);
  const [isLoadingApplication, setIsLoadingApplication] = useState(true);

  // 페이지 로드 시 저장된 contact로 신청 내역 확인 (MVP: 로그인 불필요)
  useEffect(() => {
    async function loadMyApplication() {
      const savedContact = getSavedContact();
      if (!savedContact) {
        // 저장된 contact 없음 - 신규 사용자
        setIsLoadingApplication(false);
        return;
      }

      try {
        const data = await fetchJson<{ ok: true; item: ApplicationItem | null }>(
          `/api/r/${recruitment.id}/my-application?contact=${encodeURIComponent(savedContact)}`,
        );
        if (data.item) {
          setMyApplication(data.item);
        } else {
          setMyApplication(null);
        }
      } catch (e) {
        // 에러는 무시 (신청 내역이 없는 경우일 수 있음)
        setMyApplication(null);
      } finally {
        setIsLoadingApplication(false);
      }
    }

    loadMyApplication();
  }, [recruitment.id]);

  function handleAppliedCountChange(newCount: number) {
    setRecruitment((prev) => ({
      ...prev,
      appliedCount: newCount,
    }));
  }

  function handleApplicationRemoved() {
    setMyApplication(null);
    startTransition(() => {
      router.refresh();
    });
  }

  async function reloadMyApplication() {
    const savedContact = getSavedContact();
    if (!savedContact) {
      return;
    }

    setIsLoadingApplication(true);
    try {
      const data = await fetchJson<{ ok: true; item: ApplicationItem | null }>(
        `/api/r/${recruitment.id}/my-application?contact=${encodeURIComponent(savedContact)}`,
      );
      if (data.item) {
        setMyApplication(data.item);
      } else {
        setMyApplication(null);
      }
    } catch (e) {
      // 에러는 무시
      setMyApplication(null);
    } finally {
      setIsLoadingApplication(false);
    }
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
        isLoadingApplication ? (
          <div className="mt-6 rounded-lg border bg-white px-4 py-4 text-sm text-zinc-600">
            로딩 중...
          </div>
        ) : myApplication ? (
          <MyApplicationCard
            application={myApplication}
            recruitmentId={recruitment.id}
            initialAppliedCount={recruitment.appliedCount}
            onAppliedCountChange={handleAppliedCountChange}
            onApplicationRemoved={handleApplicationRemoved}
          />
        ) : (
          <ApplyForm
            recruitmentId={recruitment.id}
            initialAppliedCount={recruitment.appliedCount}
            onAppliedCountChange={handleAppliedCountChange}
            onSuccess={reloadMyApplication}
          />
        )
      ) : (
        <p className="mt-6 text-sm text-red-600">이미 마감된 모집입니다.</p>
      )}
    </>
  );
}

