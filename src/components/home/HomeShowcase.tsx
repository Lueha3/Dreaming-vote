import Link from "next/link";

import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { ChurchLineArt } from "@/components/ChurchLineArt";
import { Reveal } from "@/components/home/Reveal";
import { ScrollDemo } from "@/components/home/ScrollDemo";

/**
 * 방문자용 홈 쇼케이스 — 비로그인/미가입/반려/승인대기 상태에서 홈(/)에 노출.
 * 승인 멤버는 이 컴포넌트 대신 기존 피드 홈을 본다(page.tsx에서 분기).
 *  - visitor: 비로그인 → 가입 CTA가 /login?next=/join
 *  - apply:   로그인 + 미가입(none)·반려(rejected) → 가입 CTA가 /join
 *  - pending: 승인 대기 → CTA 대신 대기 안내
 */
export type ShowcaseStatus = "visitor" | "apply" | "pending";

function GoldStar({ size, fill }: { size: number; fill: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none" aria-hidden>
      <path
        d="M13 1c1.4 7.4 3.4 9.4 11 11-7.6 1.6-9.6 3.6-11 11-1.4-7.4-3.4-9.4-11-11 7.6-1.6 9.6-3.6 11-11Z"
        fill={fill}
      />
    </svg>
  );
}

function JoinCta({ status, size = "lg" }: { status: ShowcaseStatus; size?: "lg" | "sm" }) {
  const cls =
    size === "lg"
      ? "btn-gold btn-glow rounded-full px-7 py-3.5 text-base font-bold"
      : "btn-gold rounded-full px-5 py-2.5 text-sm font-bold";
  if (status === "pending") {
    return (
      <span
        className={`glass-soft inline-flex items-center gap-2 rounded-full font-semibold text-skyx-ink ${
          size === "lg" ? "px-6 py-3.5 text-[15px]" : "px-5 py-2.5 text-sm"
        }`}
      >
        ⏳ 승인 대기중 — 곧 만나요!
      </span>
    );
  }
  return (
    <Link href={status === "visitor" ? "/login?next=/join" : "/join"} className={cls}>
      가입 신청하기 →
    </Link>
  );
}

export function HomeShowcase({ status }: { status: ShowcaseStatus }) {
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <div className="mx-auto max-w-2xl px-4 pt-6">
        <AnnouncementBanner />
        {status === "pending" && (
          <div className="glass-card mb-2 flex items-center gap-3 px-5 py-3.5 text-sm text-ink">
            <span aria-hidden>⏳</span>
            <span>
              <b>가입 승인을 기다리는 중이에요.</b>{" "}
              <span className="text-ink-soft">운영진이 확인하면 알려드릴게요. 그동안 아래에서 어떤 앱인지 구경해보세요!</span>
            </span>
          </div>
        )}
      </div>

      {/* ── S1. 히어로 ─────────────────────────────────────────── */}
      <section
        className="relative grid place-items-center overflow-clip px-6 pb-24 pt-14 text-center"
        style={{ minHeight: "max(560px, 88svh)" }}
      >
        {/* 앰비언트: 글로우·구름·별 */}
        <span className="sky-glow" style={{ width: 420, height: 420, left: -120, top: -80, background: "rgba(127,189,228,.5)" }} aria-hidden />
        <span className="sky-glow" style={{ width: 380, height: 380, right: -100, top: "30%", background: "rgba(240,180,41,.22)" }} aria-hidden />
        <span className="sky-glow" style={{ width: 340, height: 340, left: "14%", bottom: -120, background: "rgba(53,195,180,.2)" }} aria-hidden />
        <span className="sky-cloud" style={{ width: 190, height: 64, left: "6%", top: "18%" }} aria-hidden />
        <span className="sky-cloud" style={{ width: 150, height: 52, right: "9%", top: "12%", animationDelay: "-6s" }} aria-hidden />
        <span className="sky-cloud" style={{ width: 230, height: 70, right: "16%", bottom: "16%", animationDelay: "-11s" }} aria-hidden />
        <span className="sky-star" style={{ left: "19%", top: "30%" }} aria-hidden>
          <GoldStar size={22} fill="#F0B429" />
        </span>
        <span className="sky-star" style={{ right: "22%", top: "24%", animationDelay: "-2.4s" }} aria-hidden>
          <GoldStar size={14} fill="#D99B0B" />
        </span>
        <span className="sky-star" style={{ right: "31%", bottom: "26%", animationDelay: "-3.8s" }} aria-hidden>
          <GoldStar size={11} fill="#FFFFFF" />
        </span>

        {/* 화면이 작아 아래쪽 스크롤 힌트가 첫 화면에 안 보일 수 있어, 상단에도 작게 하나 더 둔다. */}
        <div
          className="absolute top-2 left-1/2 flex -translate-x-1/2 items-center gap-1 text-[11px] font-semibold text-ink-faint/80"
          aria-hidden
        >
          아래로 내려보세요
          <svg className="cue-bob" width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M3 6l5 5 5-5" stroke="#8A95A1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="relative z-[1]">
          <span className="glass-soft inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-skyx-ink shadow-[0_8px_24px_-8px_rgba(74,144,194,.22)]">
            <span
              className="h-[7px] w-[7px] rounded-full bg-teal"
              style={{ boxShadow: "0 0 0 4px rgba(53,195,180,.18), 0 0 10px rgba(53,195,180,.7)" }}
            />
            꿈꾸는교회 청년부
          </span>
          <h1 className="mb-2 mt-6 text-[clamp(44px,8.6vw,84px)] font-black leading-[1.1] tracking-[-0.035em] text-ink">
            오늘의,
            <br />
            <em className="not-italic gradient-text">청년부.</em>
          </h1>
          <p className="mx-auto mt-4 max-w-[30em] text-[clamp(16px,2.4vw,19px)] font-medium leading-[1.8] text-ink-soft">
            새 소식, 모임, 기도제목, 생일까지.
            <br />
            우리 청년부 이야기가 매일 여기 올라와요.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <JoinCta status={status} />
            <a
              href="#demo"
              className="glass-soft inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-semibold text-skyx-ink transition-transform hover:-translate-y-0.5"
            >
              어떻게 쓰는지 보기
            </a>
          </div>
        </div>

        <div className="absolute bottom-9 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5 text-[12.5px] font-semibold text-ink-faint" aria-hidden>
          아래로 내려보세요
          <svg className="cue-bob" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 6l5 5 5-5" stroke="#8A95A1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* ── S2. 스토리 ─────────────────────────────────────────── */}
      <section className="px-6 py-[clamp(80px,13vh,140px)] text-center">
        <Reveal>
          <p className="eyebrow-label justify-center">왜 만들었냐면요</p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="mx-auto mt-4 max-w-[21em] text-[clamp(28px,5.2vw,50px)] font-extrabold leading-[1.3] tracking-[-0.03em] text-ink">
            예배 끝나고 다 같이 모이는 그 시간,
            <br />
            솔직히 좀 <span className="gradient-text">뻘쭘하지</span> 않았어요?
          </h2>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mx-auto mt-6 max-w-[32em] text-[clamp(15.5px,2.2vw,18px)] leading-[1.85] text-ink-soft">
            아는 사람들은 자기들끼리 얘기하고, 나는 어디에 낄지 몰라서 괜히 폰만 보게 되는 그 시간이요.
            새로 왔든 오래 다녔든 다들 한 번쯤 겪어봤을 거예요.
            그래서 만들었어요. 내 꿈터 밖의 사람들과도 자연스럽게 가까워질 수 있게요.
          </p>
        </Reveal>
        <div className="mt-11 flex flex-wrap justify-center gap-3">
          <Reveal delay={0.1}>
            <div className="glass-card min-w-[210px] max-w-[260px] rounded-2xl px-5 py-4 text-left">
              <span className="mb-2 block text-xl" aria-hidden>⛪</span>
              <b className="block text-[16.5px] font-extrabold text-ink">러비아 · 유디코 · 엘리온</b>
              <span className="mt-1 block text-[13px] leading-relaxed text-ink-soft">
                따로 놀던 세 공동체가 한 광장에서 만나요
              </span>
            </div>
          </Reveal>
          <Reveal delay={0.18}>
            <div className="glass-card min-w-[210px] max-w-[260px] rounded-2xl px-5 py-4 text-left">
              <span className="mb-2 block text-xl" aria-hidden>💬</span>
              <b className="block text-[16.5px] font-extrabold text-ink">월요일마다 새 질문</b>
              <span className="mt-1 block text-[13px] leading-relaxed text-ink-soft">
                가볍게 답하다 보면 어느새 서로를 알게 돼요
              </span>
            </div>
          </Reveal>
          <Reveal delay={0.26}>
            <div className="glass-card min-w-[210px] max-w-[260px] rounded-2xl px-5 py-4 text-left">
              <span className="mb-2 block text-xl" aria-hidden>🌱</span>
              <b className="block text-[16.5px] font-extrabold text-ink">새가족은 45일 동안 케어</b>
              <span className="mt-1 block text-[13px] leading-relaxed text-ink-soft">
                환영 글부터 짝꿍까지 앱이 알아서 챙겨요
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── S3. 스크롤 시연 슬라이드 ───────────────────────────── */}
      <ScrollDemo />

      {/* ── S4. 그 외 기능 ─────────────────────────────────────── */}
      <section className="px-6 py-[clamp(56px,9vh,96px)] text-center">
        <Reveal>
          <h2 className="text-[clamp(24px,4vw,36px)] font-extrabold tracking-[-0.03em] text-ink">
            이런 것도 있어요
          </h2>
        </Reveal>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          {[
            ["🧑‍🤝‍🧑", "멤버 둘러보기"],
            ["🧭", "성격유형 카드"],
            ["🔔", "푸시 알림"],
            ["🌿", "응답된 기도 모아보기"],
            ["📢", "전체 공지"],
          ].map(([emoji, label], i) => (
            <Reveal key={label} delay={0.05 * (i + 1)}>
              <span className="glass-soft inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold text-ink-soft">
                <span aria-hidden>{emoji}</span>
                {label}
              </span>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── S5. CTA ────────────────────────────────────────────── */}
      <section className="px-6 pt-[clamp(40px,7vh,80px)]">
        <Reveal>
          <div className="glass-card glass-ribbon relative mx-auto max-w-[880px] overflow-hidden rounded-[32px] px-6 py-12 text-center sm:px-14 sm:py-16">
            <p className="eyebrow-label justify-center">같이해요</p>
            <h2 className="mt-3 text-[clamp(26px,4.4vw,42px)] font-extrabold leading-[1.35] tracking-[-0.03em] text-ink">
              다음 주엔 인사할 사람이
              <br />한 명 더 생길 거예요
            </h2>
            <p className="mx-auto mb-8 mt-4 max-w-[28em] text-[16px] text-ink-soft">
              {status === "pending"
                ? "승인이 완료되면 광장부터 동아리까지 바로 시작할 수 있어요."
                : "구글 계정으로 1분이면 가입 신청 끝. 운영진이 확인하고 승인해드려요."}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <JoinCta status={status} />
              <a
                href="#demo"
                className="glass-soft inline-flex items-center rounded-full px-6 py-3.5 text-[15px] font-semibold text-skyx-ink"
              >
                기능 다시 보기
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── 푸터: 교회 라인아트 ────────────────────────────────── */}
      <footer className="px-6 pb-8 pt-12">
        <div className="flex justify-center" aria-hidden>
          <ChurchLineArt />
        </div>
        <p className="pt-6 text-center text-[12.5px] font-medium text-ink/55">
          Dreaming Church <span className="mx-1 text-ink/30">·</span> 꿈꾸는교회 청년부{" "}
          <span className="mx-1 text-ink/30">·</span> BlueHumanity
        </p>
      </footer>
    </div>
  );
}
