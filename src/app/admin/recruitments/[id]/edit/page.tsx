"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { fetchJson } from "@/lib/http";
import { RecruitmentForm } from "../../components/RecruitmentForm";

type RecruitmentData = {
  id: string;
  title: string;
  content: string;
  capacity: number;
  status: string;
  appliedCount: number;
};

export default function EditRecruitmentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<RecruitmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRecruitment() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchJson<{ ok: true; item: RecruitmentData }>(
          `/api/admin/recruitments/${id}`,
          { cache: "no-store" },
        );
        setData(res.item);
      } catch (e: unknown) {
        const errorMessage =
          e instanceof Error ? e.message : "모집글을 불러오는데 실패했습니다.";
        console.error("Failed to load recruitment:", e);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadRecruitment();
    }
  }, [id]);

  if (loading) {
    return <p className="text-zinc-500">로딩 중...</p>;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border px-4 py-2 text-sm"
        >
          돌아가기
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <p className="text-zinc-500">모집글을 찾을 수 없습니다.</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border px-4 py-2 text-sm"
        >
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <>
      <h2 className="mb-6 text-xl font-bold">모집글 수정</h2>
      <RecruitmentForm mode="edit" initialData={data} />
    </>
  );
}

