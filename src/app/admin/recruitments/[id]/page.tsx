"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { fetchJson } from "@/lib/http";

type Application = {
  id: string;
  contact: string;
  name: string | null;
  message: string | null;
  createdAt: string;
};

type ApplicationsResponse = {
  ok: true;
  items: Application[];
};

export default function AdminRecruitmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    // Next.js 16: params may be a Promise
    const resolveParams = async () => {
      const resolved = params instanceof Promise ? await params : params;
      setId(resolved.id);
    };
    resolveParams();

  }, [params]);

  useEffect(() => {
    if (!id) return;
    loadApplications();
  }, [id]);

  async function loadApplications() {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await fetchJson<ApplicationsResponse>(
        `/api/admin/recruitments/${id}/applications`,
        {
          cache: "no-store",
        },
      );
      setItems(data.items ?? []);
    } catch (e: any) {
      console.error("Failed to load applications:", e);
      setError(e?.message ?? "신청자 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string) {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return dateString;
    }
  }

  function formatDateForExport(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toISOString();
    } catch {
      return dateString;
    }
  }

  function escapeCSV(value: string | null): string {
    if (value === null || value === undefined) {
      return "";
    }
    // Escape quotes and wrap in quotes if contains comma, newline, or quote
    const str = String(value);
    if (str.includes(",") || str.includes("\n") || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  function handleCopyTSV() {
    const header = "contact\tname\tmessage\tcreatedAt";
    const lines = items.map((item) => {
      return [
        item.contact,
        item.name ?? "",
        item.message ?? "",
        formatDateForExport(item.createdAt),
      ].join("\t");
    });

    const tsv = [header, ...lines].join("\n");
    navigator.clipboard.writeText(tsv).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }).catch(() => {
      alert("클립보드 복사에 실패했습니다.");
    });
  }

  function handleDownloadCSV() {
    const headers = ["contact", "name", "message", "createdAt"];
    const csvLines = [
      headers.map(escapeCSV).join(","),
      ...items.map((item) => {
        return [
          escapeCSV(item.contact),
          escapeCSV(item.name),
          escapeCSV(item.message),
          escapeCSV(formatDateForExport(item.createdAt)),
        ].join(",");
      }),
    ];

    const csv = csvLines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `applications-${id}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  if (!id) {
    return <p className="text-zinc-500">로딩 중...</p>;
  }

  return (
    <>
      <h2 className="mb-6 text-xl font-bold">신청자 목록</h2>

      {loading ? (
        <p className="text-zinc-500">로딩 중...</p>
      ) : error ? (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-600">
              {items.length === 0 ? "신청자가 없습니다." : `총 ${items.length}명`}
            </p>
            <div className="flex items-center gap-2">
              {copySuccess && (
                <span className="text-xs text-emerald-600">복사 완료</span>
              )}
              <button
                onClick={handleCopyTSV}
                className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-zinc-50"
              >
                복사하기
              </button>
              <button
                onClick={handleDownloadCSV}
                className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-zinc-50"
              >
                CSV 다운로드
              </button>
            </div>
          </div>
          {items.length > 0 && (
            <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-zinc-50">
                  <th className="px-3 py-2 text-left text-xs font-medium text-zinc-700">
                    연락처
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-zinc-700">
                    이름
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-zinc-700">
                    메시지
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-zinc-700">
                    신청일시
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="px-3 py-2 text-sm">{item.contact}</td>
                    <td className="px-3 py-2 text-sm">
                      {item.name ?? "(이름 없음)"}
                    </td>
                    <td className="px-3 py-2 text-sm text-zinc-600">
                      {item.message ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-500">
                      {formatDate(item.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
