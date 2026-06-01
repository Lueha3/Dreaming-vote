import { PromptSection } from "./components/PromptSection";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute top-1/2 -left-32 w-[350px] h-[350px] rounded-full bg-blue-600/8 blur-[100px]" />
      </div>

      <main className="relative mx-auto max-w-2xl px-4 py-12">
        {/* 뱃지 */}
        <div className="mb-5 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-zinc-400 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
            AI 기반 비즈니스 페르소나 분석
          </span>
        </div>

        {/* Hero */}
        <div className="mb-10 text-center">
          <h1 className="mb-3 text-4xl font-bold tracking-tight leading-tight">
            AI가 본{" "}
            <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
              진짜 나
            </span>
            를 발견하세요
          </h1>
          <p className="text-sm text-zinc-500 leading-relaxed">
            내가 자주 쓰는 AI와 나눈 대화를 분석해
            <br />
            나만의 비즈니스 페르소나 리포트를 만들어드려요.
          </p>
        </div>

        {/* 4단계 슬라이드 카드 */}
        <PromptSection />
      </main>
    </div>
  );
}
