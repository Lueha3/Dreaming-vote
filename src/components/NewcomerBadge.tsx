/** 새가족 배지(🌱) — 승인 후 일정 기간(lib/newcomer.ts) 표시. 기존 멤버가 먼저 다가갈 신호. */
export function NewcomerBadge({ size = "md" }: { size?: "sm" | "md" }) {
  const sizeCls = size === "sm" ? "gap-0.5 px-2 py-0.5 text-[10px]" : "gap-1 px-2.5 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border border-skyx/40 bg-skyx/10 font-medium text-skyx-ink ${sizeCls}`}
    >
      <span className="leading-none">🌱</span>
      새가족
    </span>
  );
}
