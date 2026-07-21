import Link from "next/link";
import { triggerHaptic } from "@/lib/haptics";

/**
 * 홈 피드 공용 섹션 헤더 — 골드→틸 틱바 + 영문 킥커 + 한글 타이틀 + (선택) 액션 링크.
 * 기존의 '이모지 + text-xs' 라벨을 잡지형 킥커 락업으로 통일한다.
 * 영문 킥커는 단독으로 쓰지 않고 항상 한글 타이틀과 병기해 이질감을 줄인다.
 */
export function HomeSectionHeader({
  kicker,
  title,
  actionHref,
  actionLabel,
  className,
}: {
  kicker: string;
  title: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-end gap-2.5 ${className ?? ""}`}>
      <span
        aria-hidden
        className="mt-0.5 h-[15px] w-[3px] shrink-0 rounded-full bg-gradient-to-b from-gold to-teal"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-skyx-ink/75">
          {kicker}
        </p>
        <h2 className="mt-px truncate text-[15px] font-extrabold tracking-tight text-ink">{title}</h2>
      </div>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          onClick={() => triggerHaptic()}
          className="group shrink-0 whitespace-nowrap pb-0.5 text-[11px] font-semibold text-skyx-ink"
        >
          {actionLabel}{" "}
          <span className="inline-block transition-transform group-hover:translate-x-0.5 group-active:translate-x-0.5">
            →
          </span>
        </Link>
      )}
    </div>
  );
}
