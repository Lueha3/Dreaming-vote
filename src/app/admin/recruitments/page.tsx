"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { fetchJson } from "@/lib/http";

type Recruitment = {
  id: string;
  title: string;
  description: string;
  status: string;
  capacity: number;
  appliedCount: number;
};

type ListResponse = {
  ok: true;
  items: Recruitment[];
};

export default function AdminRecruitmentsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Recruitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  useEffect(() => {
    loadRecruitments();
  }, []);

  async function loadRecruitments() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchJson<ListResponse>("/api/recruitments", {
        cache: "no-store",
      });
      setItems(data.items ?? []);
    } catch (e: any) {
      console.error("Failed to load recruitments:", e);
      setError(e?.message ?? "모집 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(id: string, currentStatus: string) {
    setUpdatingId(id);
    setToggleError(null);
    try {
      const newStatus = currentStatus === "open" ? "closed" : "open";
      await fetchJson(`/api/admin/recruitments/${id}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      // 목록 새로고침
      await loadRecruitments();
    } catch (e: any) {
      console.error("Failed to update status:", e);
      setToggleError(e?.message ?? "상태 변경에 실패했습니다.");
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return <p className="text-zinc-500">로딩 중...</p>;
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">모집글 목록</h2>
        <Link
          href="/admin/recruitments/new"
          className="rounded-md border px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          새 모집글 생성
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {toggleError && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {toggleError}
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-zinc-500">등록된 모집이 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border bg-white px-4 py-3 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Link
                    href={`/r/${item.id}`}
                    className="text-base font-medium text-zinc-900 hover:underline"
                  >
                    {item.title ?? "(untitled)"}
                  </Link>
                  <p className="mt-1 text-sm text-zinc-700">
                    {item.description ?? ""}
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500">
                    <span>
                      정원 {item.capacity ?? 0}명 / 신청 {item.appliedCount ?? 0}명
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.status === "open"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {item.status === "open" ? "모집중" : "마감"}
                    </span>
                  </div>
                </div>
                <div className="ml-4 flex flex-col gap-2">
                  <Link
                    href={`/admin/recruitments/${item.id}`}
                    className="rounded-md border px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    신청자 보기
                  </Link>
                  <button
                    onClick={() => toggleStatus(item.id, item.status)}
                    disabled={updatingId === item.id}
                    className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-60"
                  >
                    {updatingId === item.id
                      ? "변경 중..."
                      : item.status === "open"
                        ? "마감하기"
                        : "열기"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
