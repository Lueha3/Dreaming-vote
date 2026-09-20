import Link from "next/link";

/**
 * 광고하기 버튼 장난 페이지 — 진짜 광고 기능 대신 여기로 보낸다.
 * ClubDetailView의 "📣 광고하기" 링크 두 군데(개설자용/멤버용)가 여길 가리킨다.
 */
export default function PrankPage() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-6 text-center">
      <div className="glass-card max-w-sm p-10">
        <p className="text-6xl">🤪</p>
        <h1 className="mt-4 text-3xl font-extrabold text-ink">메롱!</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          광고 기능은... 아직 없어요.
          <br />
          속으셨죠 ㅋㅋ
        </p>
        <Link
          href="/clubs"
          className="btn-gold btn-glow mt-6 inline-block rounded-full px-6 py-3 text-sm font-semibold"
        >
          ← 동아리 목록으로
        </Link>
      </div>
    </div>
  );
}
