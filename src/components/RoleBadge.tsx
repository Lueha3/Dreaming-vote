import { roleBadge, type Role } from "@/lib/roles";

// 공개 앱(글래스/ink/gold/teal/skyx) 팔레트 — /admin 다크 테마에는 사용하지 않는다.
const ROLE_CLS: Partial<Record<Role, string>> = {
  admin: "border-gold/35 bg-gold/10 text-gold-ink",
  superadmin: "border-gold/35 bg-gold/10 text-gold-ink", // 외부 표기상 관리자와 동일
  staff: "border-skyx/40 bg-skyx/10 text-skyx-ink",
  club_leader: "border-teal/35 bg-teal/10 text-teal-ink",
};

/**
 * 인증마크 배지 — 관리자(🛡️) · 운영진(⭐) · 동아리장(👑) 3종.
 * member 등 배지 없는 역할이면 아무것도 렌더하지 않는다.
 */
export function RoleBadge({ role, size = "md" }: { role: Role; size?: "sm" | "md" }) {
  const meta = roleBadge(role);
  if (!meta) return null;

  const cls = ROLE_CLS[role] ?? "glass-soft text-ink-soft";
  const sizeCls =
    size === "sm" ? "gap-0.5 px-2 py-0.5 text-[10px]" : "gap-1 px-2.5 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border font-medium ${cls} ${sizeCls}`}
    >
      <span className="leading-none">{meta.emoji}</span>
      {meta.label}
    </span>
  );
}
