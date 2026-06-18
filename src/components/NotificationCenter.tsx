"use client";

import { useEffect, useState } from "react";

type Notice = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  createdAt: string;
};

const ICON: Record<string, string> = {
  membership_approved: "🎉",
  membership_rejected: "💌",
};

/**
 * 전역 알림 센터 — 로그인 유저의 미읽음 알림을 다음 방문 시 모달로 띄운다.
 * 가입 승인/거절 결과를 본인에게 즉시 전달하는 용도. layout에 마운트.
 * 비로그인(인증 쿠키 없음)은 서버 왕복 없이 즉시 스킵(AnnouncementBanner와 동일 패턴).
 */
export function NotificationCenter() {
  const [items, setItems] = useState<Notice[]>([]);

  useEffect(() => {
    // 인증 쿠키가 없으면 비로그인 — fetch 자체를 건너뛴다.
    if (!/sb-[a-z0-9-]+-auth-token/i.test(document.cookie)) return;

    let alive = true;
    fetch("/api/notifications", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!alive || !j?.ok || !j.items?.length) return;
        setItems(j.items as Notice[]);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  async function dismiss() {
    const ids = items.map((n) => n.id);
    setItems([]); // 즉시 닫고
    try {
      await fetch("/api/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
    } catch {
      /* 읽음 처리 실패해도 UX는 닫힘 유지 — 다음 방문 시 다시 노출될 뿐 */
    }
  }

  if (items.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={dismiss}
    >
      <div
        className="glass-card w-full max-w-sm overflow-hidden p-6"
        style={{ background: "rgba(255,255,255,.94)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-5">
          {items.map((n) => (
            <div key={n.id} className="flex gap-3">
              <span className="mt-0.5 shrink-0 text-2xl" aria-hidden>
                {ICON[n.type] ?? "🔔"}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink">{n.title}</p>
                {n.body && (
                  <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-ink-soft">
                    {n.body}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={dismiss}
          className="btn-gold mt-6 w-full rounded-xl py-3 text-sm font-semibold"
        >
          확인했어요
        </button>
      </div>
    </div>
  );
}
