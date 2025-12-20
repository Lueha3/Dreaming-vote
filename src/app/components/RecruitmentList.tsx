"use client";

import Link from "next/link";
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

export function RecruitmentList() {
  const [items, setItems] = useState<Recruitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRecruitments() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchJson<ListResponse>("/api/recruitments");
        setItems(data.items ?? []);
      } catch (e: any) {
        console.error("Failed to load recruitments:", e);
        setError(e?.message ?? "모집 목록을 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    }

    loadRecruitments();
  }, []);

  if (loading) {
    return <p className="text-zinc-500">로딩 중...</p>;
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  if (items.length === 0) {
    return <p className="text-zinc-500">등록된 모집이 없습니다.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-lg border bg-white px-4 py-3 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <Link
              href={`/r/${item.id}`}
              className="text-base font-medium text-zinc-900 hover:underline"
            >
              {item.title ?? "(untitled)"}
            </Link>
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
          <p className="mt-1 text-sm text-zinc-700">
            {item.description ?? ""}
          </p>
          <div className="mt-1 text-xs text-zinc-500">
            정원 {item.capacity ?? 0}명 / 신청 {item.appliedCount ?? 0}명
          </div>
        </li>
      ))}
    </ul>
  );
}

