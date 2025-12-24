"use client";

import Link from "next/link";
import { useState } from "react";

import { fetchJson } from "@/lib/http";
import { setSavedContact } from "@/lib/contactStorage";

type ApplicationItem = {
  id: string;
  recruitmentId: string;
  recruitment: {
    id: string;
    title: string;
    status: string;
  };
  name: string | null;
  message: string | null;
  appliedAt: string;
};

type MyApplicationsResponse = {
  ok: true;
  items: ApplicationItem[];
};

export default function MyApplicationsPage() {
  const [contact, setContact] = useState("");
  const [items, setItems] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();

    if (!contact.trim()) {
      setError("이메일 또는 휴대폰을 입력해주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const contactTrimmed = contact.trim();
      const data = await fetchJson<MyApplicationsResponse>(
        `/api/my-applications?contact=${encodeURIComponent(contactTrimmed)}`,
      );
      setItems(data.items ?? []);
      
      // Contact 저장 (정규화: 클라이언트에서 간단히 처리)
      // 이메일인 경우 소문자, 전화번호인 경우 숫자만
      const normalized = contactTrimmed.includes("@")
        ? contactTrimmed.toLowerCase()
        : contactTrimmed.replace(/\D/g, "");
      setSavedContact(normalized);
    } catch (e: any) {
      // Dev에서만 상세 로그, 사용자에겐 친화적 메시지
      console.debug("Failed to load applications:", e?.message);
      setError("조회 실패. 잠시 후 다시 시도해주세요.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-bold">내 신청내역</h1>

        <form onSubmit={handleSearch} className="mb-6 space-y-4 rounded-lg border bg-white px-4 py-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              이메일 또는 휴대폰
            </label>
            <div className="flex gap-2">
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
                className="flex-1 rounded-md border px-3 py-2 text-sm"
                placeholder="example@email.com 또는 01012345678"
                required
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading ? "조회 중..." : "조회"}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {hasSearched && !loading && (
          <>
            {items.length === 0 ? (
              <p className="text-zinc-500">신청한 모집이 없습니다.</p>
            ) : (
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/my/applications/${item.id}`}
                      className="block rounded-lg border bg-white px-4 py-3 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50/30 active:bg-emerald-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <span className="text-base font-medium text-zinc-900">
                            {item.recruitment.title}
                          </span>
                          {item.name && (
                            <p className="mt-1 text-sm text-zinc-600">이름: {item.name}</p>
                          )}
                          {item.message && (
                            <p className="mt-1 text-sm text-zinc-600">{item.message}</p>
                          )}
                          <div className="mt-2 text-xs text-zinc-500">
                            신청일:{" "}
                            {new Date(item.appliedAt).toLocaleString("ko-KR", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                        <span
                          className={`ml-4 rounded-full px-2 py-0.5 text-xs font-medium ${
                            item.recruitment.status === "open"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          {item.recruitment.status === "open" ? "모집중" : "마감"}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}

