"use client";

import { useRouter } from "next/navigation";

/**
 * 광고하기 버튼 장난 페이지 — 진짜 광고 기능 대신 여기로 보낸다.
 * ClubDetailView의 "📣 광고하기" 링크 두 군데(개설자용/멤버용)가 여길 가리킨다.
 */
export default function PrankPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-6 text-center">
      <div className="glass-card max-w-sm p-10">
        <p className="text-6xl">🤪</p>
        <h1 className="mt-4 text-4xl font-extrabold text-ink">메롱~</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">만들다 말았지롱</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-gold btn-glow mt-6 inline-block rounded-full px-6 py-3 text-sm font-semibold"
        >
          ← 돌아가기
        </button>
      </div>
    </div>
  );
}
