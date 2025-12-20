"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { fetchJson, safeJson } from "@/lib/http";
import { getSavedContact, clearSavedContact } from "@/lib/contactStorage";

type ApplicationDetail = {
  id: string;
  recruitmentId: string;
  contact: string;
  contactNormalized: string;
  name: string | null;
  message: string | null;
  createdAt: string;
  recruitment: {
    id: string;
    title: string;
    status: string;
    content: string;
  };
};

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default function MyApplicationDetailPage({ params }: PageProps) {
  const router = useRouter();
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 편집 상태
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // params 해결
  useEffect(() => {
    async function resolveParams() {
      const resolved = await params;
      setApplicationId(resolved.id);
    }
    resolveParams();
  }, [params]);

  // 신청 내역 로드
  useEffect(() => {
    if (!applicationId) return;

    async function loadApplication() {
      const savedContact = getSavedContact();
      if (!savedContact) {
        setError("연락처 정보가 없습니다. 내 신청내역에서 다시 조회해주세요.");
        setLoading(false);
        return;
      }

      try {
        const data = await fetchJson<{ ok: true; item: ApplicationDetail }>(
          `/api/my-application/${applicationId}?contact=${encodeURIComponent(savedContact)}`,
        );
        setApplication(data.item);
        setName(data.item.name || "");
        setMessage(data.item.message || "");
      } catch (e: any) {
        console.debug("Failed to load application:", e?.message);
        if (e?.message?.includes("FORBIDDEN")) {
          setError("접근 권한이 없습니다.");
        } else if (e?.message?.includes("찾을 수 없")) {
          setError("신청 내역을 찾을 수 없습니다.");
        } else {
          setError("조회 실패. 잠시 후 다시 시도해주세요.");
        }
      } finally {
        setLoading(false);
      }
    }

    loadApplication();
  }, [applicationId]);

  // 수정 저장
  async function handleSave() {
    if (isSubmitting || !application) return;

    const savedContact = getSavedContact();
    if (!savedContact) {
      setAlert({ type: "error", message: "연락처 정보가 없습니다." });
      return;
    }

    setIsSubmitting(true);
    setAlert(null);

    try {
      const res = await fetch(`/api/my-application/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact: savedContact,
          name: name.trim() || undefined,
          message: message.trim() || undefined,
        }),
      });

      const data = await safeJson<any>(res);

      if (!res.ok || data?.ok === false) {
        setAlert({ type: "error", message: data?.error ?? "수정에 실패했습니다." });
        return;
      }

      setApplication((prev) =>
        prev
          ? {
              ...prev,
              name: name.trim() || null,
              message: message.trim() || null,
            }
          : null,
      );
      setAlert({ type: "success", message: "수정 완료" });
      setIsEditing(false);

      setTimeout(() => setAlert(null), 3000);
    } catch (e) {
      setAlert({ type: "error", message: "수정 중 오류가 발생했습니다." });
    } finally {
      setIsSubmitting(false);
    }
  }

  // 신청 취소
  async function handleCancel() {
    if (isSubmitting || !application) return;

    const confirmed = window.confirm("정말 신청을 취소하시겠습니까?");
    if (!confirmed) return;

    const savedContact = getSavedContact();
    if (!savedContact) {
      setAlert({ type: "error", message: "연락처 정보가 없습니다." });
      return;
    }

    setIsSubmitting(true);
    setAlert(null);

    try {
      const res = await fetch(`/api/my-application/${application.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact: savedContact,
        }),
      });

      const data = await safeJson<any>(res);

      if (!res.ok || data?.ok === false) {
        setAlert({ type: "error", message: data?.error ?? "취소에 실패했습니다." });
        setIsSubmitting(false);
        return;
      }

      // 성공 - 목록으로 이동
      router.push("/my");
    } catch (e) {
      setAlert({ type: "error", message: "취소 중 오류가 발생했습니다." });
      setIsSubmitting(false);
    }
  }

  // 연락처 마스킹
  function maskContact(contact: string): string {
    if (contact.includes("@")) {
      return contact;
    }
    if (contact.length <= 7) {
      return contact;
    }
    return `${contact.slice(0, 3)}****${contact.slice(-4)}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900">
        <main className="mx-auto max-w-3xl px-4 py-8">
          <p className="text-zinc-500">로딩 중...</p>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900">
        <main className="mx-auto max-w-3xl px-4 py-8">
          <div className="rounded-lg border bg-white px-4 py-6 text-center">
            <p className="mb-4 text-red-600">{error}</p>
            <Link
              href="/my"
              className="text-sm text-emerald-600 hover:underline"
            >
              ← 내 신청내역으로 돌아가기
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900">
        <main className="mx-auto max-w-3xl px-4 py-8">
          <p className="text-zinc-500">신청 내역을 찾을 수 없습니다.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* 뒤로가기 */}
        <Link
          href="/my"
          className="mb-4 inline-block text-sm text-zinc-500 hover:text-zinc-700"
        >
          ← 내 신청내역
        </Link>

        {/* 모집 정보 */}
        <div className="mb-6 rounded-lg border bg-white px-4 py-4">
          <div className="mb-2 flex items-center gap-2">
            <h1 className="text-xl font-bold">{application.recruitment.title}</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                application.recruitment.status === "open"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-zinc-100 text-zinc-500"
              }`}
            >
              {application.recruitment.status === "open" ? "모집중" : "마감"}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-sm text-zinc-600">
            {application.recruitment.content}
          </p>
        </div>

        {/* 내 신청 정보 - 읽기 모드 */}
        {!isEditing && (
          <div className="rounded-lg border bg-white px-4 py-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">내 신청 정보</h2>
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
                  신청 취소
                </button>
              </div>
            </div>

            {alert && (
              <div
                className={`mb-4 rounded-md px-3 py-2 text-sm ${
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
                <span className="text-zinc-600">{maskContact(application.contact)}</span>
              </div>
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
            </div>
          </div>
        )}

        {/* 내 신청 정보 - 편집 모드 */}
        {isEditing && (
          <form
            className="rounded-lg border bg-white px-4 py-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <div className="mb-4">
              <h2 className="text-base font-semibold">내 신청 정보 수정</h2>
            </div>

            {alert && (
              <div
                className={`mb-4 rounded-md px-3 py-2 text-sm ${
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
                <span className="text-zinc-600">{maskContact(application.contact)}</span>
              </div>
              <div>
                <label className="mb-1 block font-medium text-zinc-700">
                  이름 (선택사항)
                </label>
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
                <label className="mb-1 block font-medium text-zinc-700">
                  한 줄 소개 (선택사항)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="간단한 자기소개를 입력해주세요"
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
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
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {isSubmitting ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

