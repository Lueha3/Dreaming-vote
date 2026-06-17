"use client";

import { useEffect, useState } from "react";
import { RoleBadge } from "@/components/RoleBadge";
import {
  ASSIGNABLE_ROLES,
  canAssignRole,
  displayRoles,
  type AssignableRole,
  type Role,
} from "@/lib/roles";

type ManageUser = {
  id: string;
  nickname: string | null;
  avatarUrl: string | null;
  role: Role;
  membershipStatus: string;
  createdAt: string;
};

const ASSIGN_LABEL: Record<AssignableRole, string> = {
  member: "일반",
  staff: "운영진",
  admin: "관리자",
};

const MEMBERSHIP_LABEL: Record<string, string> = {
  approved: "승인",
  pending: "대기",
  rejected: "거절",
  none: "미신청",
};

export default function ManagePage() {
  const [items, setItems] = useState<ManageUser[]>([]);
  const [viewerRole, setViewerRole] = useState<Role | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/manage/users", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setItems(j.items);
          setViewerRole(j.viewerRole);
          setViewerId(j.viewerId);
        } else {
          setErr(j.error ?? "불러오지 못했어요.");
        }
      })
      .catch(() => setErr("불러오지 못했어요."))
      .finally(() => setLoading(false));
  }, []);

  async function changeRole(u: ManageUser, next: AssignableRole) {
    setBusyId(u.id);
    setErr(null);
    try {
      const res = await fetch(`/api/manage/users/${u.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: next }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        setErr(j.error ?? "변경에 실패했어요.");
        return;
      }
      setItems((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: next } : x)));
    } catch {
      setErr("변경에 실패했어요.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-ink-soft">불러오는 중…</p>;
  }

  const canEdit = viewerRole === "admin" || viewerRole === "superadmin";

  return (
    <div>
      <p className="mb-4 text-sm text-ink-soft">
        멤버 역할을 임명·해임합니다.{" "}
        {canEdit
          ? "운영진/관리자를 지정할 수 있어요. (동아리장은 동아리 개설 시 자동 부여)"
          : "열람 전용입니다 — 역할 변경은 관리자만 가능해요."}
      </p>

      {err && (
        <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
          {err}
        </div>
      )}

      <ul className="space-y-2">
        {items.map((u) => {
          const isSelf = u.id === viewerId;
          return (
            <li key={u.id} className="glass-card flex items-center justify-between gap-3 p-3">
              <div className="flex min-w-0 items-center gap-2.5">
                {u.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-skyx/25 text-sm">
                    👤
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-ink">
                      {u.nickname ?? "(닉네임 없음)"}
                    </span>
                    {displayRoles(u.role).map((r) => (
                      <RoleBadge key={r} role={r} size="sm" />
                    ))}
                    {isSelf && <span className="text-[10px] text-ink-faint">나</span>}
                  </div>
                  <span className="text-[11px] text-ink-faint">
                    {MEMBERSHIP_LABEL[u.membershipStatus] ?? u.membershipStatus}
                  </span>
                </div>
              </div>

              {canEdit && !isSelf && (
                <div className="flex shrink-0 gap-1">
                  {ASSIGNABLE_ROLES.map((target) => {
                    const current = u.role === target;
                    const allowed = canAssignRole(viewerRole as Role, u.role, target);
                    if (!current && !allowed) return null;
                    return (
                      <button
                        key={target}
                        disabled={current || !allowed || busyId === u.id}
                        onClick={() => changeRole(u, target)}
                        className={`rounded-full border px-2 py-0.5 text-[11px] transition-all disabled:cursor-default disabled:opacity-55 ${
                          current
                            ? "border-teal/40 bg-teal/10 text-teal-ink"
                            : "glass-soft text-ink-soft hover:text-ink"
                        }`}
                      >
                        {ASSIGN_LABEL[target]}
                      </button>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
