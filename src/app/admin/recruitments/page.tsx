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

const MENU_ITEM_CLASS =
  "block w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-60";

export default function AdminRecruitmentsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Recruitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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
    } catch (e: unknown) {
      const errorMessage =
        e instanceof Error ? e.message : "모집 목록을 불러오는데 실패했습니다.";
      console.error("Failed to load recruitments:", e);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(id: string, currentStatus: string) {
    setUpdatingId(id);
    setActionError(null);
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
    } catch (e: unknown) {
      const errorMessage =
        e instanceof Error ? e.message : "상태 변경에 실패했습니다.";
      console.error("Failed to update status:", e);
      setActionError(errorMessage);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(id: string, title: string) {
    const confirmed = window.confirm(
      `"${title}" 모집글을 삭제하시겠습니까?\n\n※ 신청자가 있는 경우 삭제할 수 없습니다.`,
    );
    if (!confirmed) return;

    setDeletingId(id);
    setActionError(null);
    try {
      await fetchJson(`/api/admin/recruitments/${id}`, {
        method: "DELETE",
      });

      // 목록 새로고침
      await loadRecruitments();
    } catch (e: unknown) {
      const errorMessage =
        e instanceof Error ? e.message : "삭제에 실패했습니다.";
      console.error("Failed to delete recruitment:", e);
      setActionError(errorMessage);
      alert(errorMessage);
    } finally {
      setDeletingId(null);
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
          새 모집글
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {actionError && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
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
                <div className="relative ml-4">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMenuId(openMenuId === item.id ? null : item.id)
                    }
                    className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <circle cx="10" cy="4" r="1.5" />
                      <circle cx="10" cy="10" r="1.5" />
                      <circle cx="10" cy="16" r="1.5" />
                    </svg>
                  </button>
                  {openMenuId === item.id && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setOpenMenuId(null)}
                      />
                      <div className="absolute right-0 z-20 mt-1 w-32 rounded-md border bg-white py-1 shadow-lg">
                        <Link
                          href={`/admin/recruitments/${item.id}`}
                          className={MENU_ITEM_CLASS}
                          onClick={() => setOpenMenuId(null)}
                        >
                          신청자 보기
                        </Link>
                        <Link
                          href={`/admin/recruitments/${item.id}/edit`}
                          className={MENU_ITEM_CLASS}
                          onClick={() => setOpenMenuId(null)}
                        >
                          수정
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            toggleStatus(item.id, item.status);
                            setOpenMenuId(null);
                          }}
                          disabled={updatingId === item.id}
                          className={MENU_ITEM_CLASS}
                        >
                          {updatingId === item.id
                            ? "변경 중..."
                            : item.status === "open"
                              ? "마감하기"
                              : "열기"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleDelete(item.id, item.title);
                            setOpenMenuId(null);
                          }}
                          disabled={deletingId === item.id}
                          className={`${MENU_ITEM_CLASS} text-red-600 hover:bg-red-50`}
                        >
                          {deletingId === item.id ? "삭제 중..." : "삭제"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
