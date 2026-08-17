"use client";

import { useState } from "react";
import { AppIconMark, APP_ICON_BG } from "@/lib/appIcon";

type Device = "ios" | "android";

/**
 * 사용 설명서 — 홈 화면 추가·인앱 브라우저 탈출·알림 켜기 등
 * 어려운 기능을 쉬운 말로 설명하는 공개 페이지. 로그인 없이도 접근 가능
 * (카톡 브라우저 탈출법처럼 로그인 전에 필요한 안내도 있어서 게이트를 걸지 않는다).
 */
export default function GuidePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Hero />
      <QuickNav />

      <div className="mt-8 space-y-7">
        <HomeScreenSection />
        <EscapeSection />
        <AlertsSection />
        <StartOrderSection />
        <GlossarySection />
        <FaqSection />
      </div>

      <p className="mt-10 text-center text-xs text-ink-faint">
        꿈꾸는교회 청년부 · 동아리드림 사용 설명서
      </p>
    </div>
  );
}

function Hero() {
  return (
    <div className="text-center">
      <div
        className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm"
        style={{ background: APP_ICON_BG }}
      >
        <AppIconMark px={48} />
      </div>
      <span className="mb-2 inline-block text-[11px] font-extrabold tracking-widest text-teal-ink uppercase">
        동아리드림 사용 설명서
      </span>
      <h1 className="mb-2 text-2xl font-extrabold text-ink sm:text-3xl">
        <span className="gradient-text">휴대폰으로 쉽게 시작하기</span>
      </h1>
      <p className="mx-auto max-w-[38ch] text-sm leading-relaxed text-ink-soft">
        어렵지 않아요. 하나씩 천천히 따라오시면 금방 익숙해져요 🙂
      </p>
    </div>
  );
}

const NAV_ITEMS = [
  { href: "#home-screen", label: "📲 홈 화면에 추가" },
  { href: "#escape", label: "🚪 카톡에서 열었다면" },
  { href: "#alerts", label: "🔔 알림 받기" },
  { href: "#start-order", label: "🧭 처음 오셨다면" },
  { href: "#glossary", label: "📖 용어 풀이" },
  { href: "#faq", label: "🆘 문제 해결" },
];

function QuickNav() {
  return (
    <nav className="mt-6 flex flex-wrap justify-center gap-2" aria-label="빠른 이동">
      {NAV_ITEMS.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className="glass-soft rounded-full px-3.5 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:text-teal-ink"
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

function SectionHead({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xl shadow-sm"
        style={{ background: "linear-gradient(135deg, #F0B429 0%, #35C3B4 100%)" }}
      >
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-extrabold text-ink sm:text-xl">{title}</h2>
        <p className="text-xs text-ink-faint">{desc}</p>
      </div>
    </div>
  );
}

function DeviceTabs({ value, onChange }: { value: Device; onChange: (d: Device) => void }) {
  return (
    <div className="glass-soft mb-4 flex gap-1 rounded-2xl p-1">
      {(["ios", "android"] as const).map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(d)}
          className={`flex-1 rounded-xl py-2 text-sm font-bold transition-all ${
            value === d ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink"
          }`}
        >
          {d === "ios" ? "iPhone (아이폰)" : "Android (안드로이드)"}
        </button>
      ))}
    </div>
  );
}

function Steps({ items }: { items: { text: React.ReactNode; sub?: string }[] }) {
  return (
    <ol className="space-y-3.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-deep text-xs font-extrabold text-[#3A2A02]">
            {i + 1}
          </span>
          <div>
            <p className="text-sm text-ink">{item.text}</p>
            {item.sub && <p className="mt-1 text-xs text-ink-faint">{item.sub}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-sky-line bg-white/70 px-1.5 py-0.5 text-[13px] font-bold text-ink">
      {children}
    </span>
  );
}

function Callout({ children, warn }: { children: React.ReactNode; warn?: boolean }) {
  return (
    <div
      className={`mt-4 rounded-2xl border px-4 py-3 text-xs leading-relaxed text-ink-soft ${
        warn ? "border-gold/40 bg-gold/15" : "border-skyx/40 bg-skyx/15"
      }`}
    >
      {children}
    </div>
  );
}

function HomeScreenSection() {
  const [device, setDevice] = useState<Device>("ios");
  return (
    <section id="home-screen" className="glass-card scroll-mt-4 p-5 sm:p-6">
      <SectionHead
        icon="📲"
        title="홈 화면에 앱처럼 추가하기"
        desc="한 번만 해두면 앱 아이콘을 눌러 바로 들어올 수 있어요"
      />
      <DeviceTabs value={device} onChange={setDevice} />
      {device === "ios" ? (
        <Steps
          items={[
            {
              text: (
                <>
                  <b>사파리(Safari)</b> 앱으로 우리 앱 주소를 열어요.
                </>
              ),
              sub: "카카오톡 안에서 누른 링크는 안 돼요 — 아래 '🚪 카톡에서 열었다면'을 먼저 봐주세요.",
            },
            {
              text: (
                <>
                  화면 아래 가운데에 있는 <Kbd>공유 ⬆️</Kbd> 버튼을 눌러요.
                </>
              ),
            },
            {
              text: (
                <>
                  메뉴를 아래로 내려서 <Kbd>홈 화면에 추가</Kbd>를 찾아 눌러요.
                </>
              ),
            },
            {
              text: (
                <>
                  오른쪽 위 <Kbd>추가</Kbd>를 누르면 끝! 홈 화면에 아이콘이 생겨요.
                </>
              ),
            },
          ]}
        />
      ) : (
        <Steps
          items={[
            {
              text: (
                <>
                  <b>크롬(Chrome)</b> 앱으로 우리 앱 주소를 열어요.
                </>
              ),
            },
            {
              text: (
                <>
                  오른쪽 위 점 3개 <Kbd>⋮</Kbd> 메뉴를 눌러요.
                </>
              ),
            },
            {
              text: (
                <>
                  <Kbd>홈 화면에 추가</Kbd> 또는 <Kbd>앱 설치</Kbd>를 눌러요.
                </>
              ),
            },
            {
              text: (
                <>
                  <Kbd>추가</Kbd>를 누르면 끝! 홈 화면에 아이콘이 생겨요.
                </>
              ),
            },
          ]}
        />
      )}
      <Callout>
        <b className="text-skyx-ink">왜 해야 하나요?</b> 아이콘을 눌러 바로 열리고, 진짜 앱처럼 주소창
        없이 깔끔하게 보여요. 아이폰은 이렇게 추가해야만 알림도 받을 수 있어요.
        <div className="mt-3 flex justify-center">
          <div className="w-full max-w-[220px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" decoding="async" src="/guide-homescreen-example.jpg"
              alt="홈 화면에 추가하면 유튜브·인스타처럼 아이콘이 그대로 생겨요"
              className="w-full rounded-xl border border-white/90 shadow-sm"
            />
            <p className="mt-1.5 text-center text-[11px] text-ink-faint">
              👆 실제로 이렇게, 다른 앱들과 똑같이 생겨요
            </p>
          </div>
        </div>
      </Callout>
    </section>
  );
}

function EscapeSection() {
  const [device, setDevice] = useState<Device>("ios");
  return (
    <section id="escape" className="glass-card scroll-mt-4 p-5 sm:p-6">
      <SectionHead
        icon="🚪"
        title="카톡·인스타에서 열었다면?"
        desc="꼭 사파리·크롬 같은 정식 브라우저로 다시 열어주세요"
      />
      <Callout warn>
        <b className="text-gold-ink">왜 그래야 하나요?</b> 카카오톡·인스타그램 안에서 여는 화면은
        &apos;미리보기 창&apos;이에요. 로그인이 안 되거나, 사진이 안 올라가거나, 알림 설정이 안 될 수 있어요.
      </Callout>
      <div className="mt-5">
        <DeviceTabs value={device} onChange={setDevice} />
        {device === "ios" ? (
          <Steps
            items={[
              {
                text: (
                  <>
                    화면 오른쪽 아래(또는 위)에서 점 3개 <Kbd>•••</Kbd> 버튼을 찾아요.
                  </>
                ),
              },
              {
                text: (
                  <>
                    <Kbd>Safari로 열기</Kbd> 또는 <Kbd>다른 브라우저로 열기</Kbd>를 눌러요.
                  </>
                ),
              },
              { text: "사파리가 열리면 준비 끝! 이제 위 '홈 화면에 추가'를 진행하세요." },
            ]}
          />
        ) : (
          <Steps
            items={[
              {
                text: (
                  <>
                    화면 오른쪽 위(또는 아래)에서 점 3개 <Kbd>⋮</Kbd> 버튼을 찾아요.
                  </>
                ),
              },
              {
                text: (
                  <>
                    <Kbd>다른 브라우저로 열기</Kbd> 또는 <Kbd>Chrome으로 열기</Kbd>를 눌러요.
                  </>
                ),
              },
              { text: "크롬이 열리면 준비 끝! 이제 위 '홈 화면에 추가'를 진행하세요." },
            ]}
          />
        )}
      </div>
    </section>
  );
}

function AlertsSection() {
  return (
    <section id="alerts" className="glass-card scroll-mt-4 p-5 sm:p-6">
      <SectionHead icon="🔔" title="휴대폰 알림 받기" desc="댓글·모임 공지 같은 새 소식을 놓치지 않아요" />
      <Steps
        items={[
          {
            text: (
              <>
                오른쪽 위 <Kbd>🪪 내 정보</Kbd> 메뉴로 들어가요.
              </>
            ),
          },
          {
            text: (
              <>
                &apos;📲 휴대폰 알림&apos; 칸에서 <Kbd>켜기</Kbd> 버튼을 눌러요.
              </>
            ),
          },
          {
            text: (
              <>
                휴대폰이 알림을 물어보면 <Kbd>허용</Kbd>을 눌러요.
              </>
            ),
          },
        ]}
      />
      <Callout>
        <b className="text-skyx-ink">아이폰을 쓰신다면</b> 먼저 위의 &apos;홈 화면에 추가&apos;를 마친 뒤, 그
        아이콘으로 들어와야만 알림을 켤 수 있어요.
      </Callout>
    </section>
  );
}

const FLOW = [
  { title: "구글로 로그인", desc: "오른쪽 위 로그인 버튼을 눌러 구글 계정으로 들어와요." },
  {
    title: "청년부 가입 신청",
    desc: "메뉴의 청년부 가입 신청을 눌러 이름·나이·연락처를 적어요. 운영진이 확인하면 승인돼요.",
  },
  { title: "성격유형 고르기", desc: "메뉴의 🧭 성격유형 고르기로 나에게 잘 맞는 동아리를 추천받아요." },
  { title: "동아리 둘러보고 참여", desc: "👥 동아리 목록에서 마음에 드는 동아리를 찾아 가입 신청해요." },
];

function StartOrderSection() {
  return (
    <section id="start-order" className="glass-card scroll-mt-4 p-5 sm:p-6">
      <SectionHead icon="🧭" title="처음 오셨다면 이 순서로" desc="딱 4단계면 모든 기능을 쓸 수 있어요" />
      <div>
        {FLOW.map((step, i) => (
          <div key={step.title} className="flex gap-3.5">
            <div className="flex flex-col items-center">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-teal text-xs font-extrabold text-teal-ink">
                {i + 1}
              </div>
              {i < FLOW.length - 1 && <div className="my-1 w-0.5 flex-1 bg-sky-line" />}
            </div>
            <div className={i < FLOW.length - 1 ? "pb-5" : ""}>
              <h3 className="mb-0.5 text-sm font-extrabold text-ink">{step.title}</h3>
              <p className="text-xs leading-relaxed text-ink-soft">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const GLOSSARY = [
  {
    name: "⏳ 승인 대기",
    desc: "가입 신청서를 냈다고 바로 활동할 수 있는 건 아니에요. 운영진이 확인할 때까지 잠깐 기다려주세요.",
  },
  {
    name: "🏷️ 활동 닉네임",
    desc: "승인되면 집단-나이-이름 형식(예: 러비아-25-홍길동)으로 자동으로 이름이 만들어져요. 신청서에 이름·나이를 정확히 적어주세요.",
  },
  {
    name: "👥 3개 나이 집단",
    desc: "러비아(20~26세) · 유디코(27~34세) · 엘리온(35세~), 나이에 따라 자동으로 나뉘어요.",
  },
  {
    name: "🗣 광장 3가지 글",
    desc: "일상(사는 얘기) · 기도해주세요(기도 부탁) · 동아리광고(동아리 홍보), 글 쓸 때 하나를 골라요.",
  },
  { name: "🙋 동아리 가입", desc: "동아리도 신청 후 개설자(동아리장)가 승인해야 정식 멤버가 돼요." },
  { name: "🚨 신고하기", desc: "불편한 글이나 동아리를 보면 신고할 수 있어요. 운영진에게만 조용히 전달돼요." },
];

function GlossarySection() {
  return (
    <section id="glossary" className="glass-card scroll-mt-4 p-5 sm:p-6">
      <SectionHead icon="📖" title="헷갈리기 쉬운 것들" desc="이것만 알면 훨씬 편해져요" />
      <div className="grid gap-3 sm:grid-cols-2">
        {GLOSSARY.map((term) => (
          <div key={term.name} className="glass-soft rounded-2xl p-4">
            <p className="mb-1 text-sm font-extrabold text-ink">{term.name}</p>
            <p className="text-xs leading-relaxed text-ink-soft">{term.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const FAQ = [
  {
    q: "사진이 안 올라가요",
    a: "카카오톡 등 인앱 브라우저에서 열었을 가능성이 커요. 위 '🚪 카톡에서 열었다면'을 따라 사파리·크롬으로 다시 열어보세요.",
  },
  {
    q: "로그인이 안 돼요",
    a: "인앱 브라우저에서는 로그인이 막힐 수 있어요. 사파리(아이폰)나 크롬(안드로이드)으로 열어서 다시 시도해주세요.",
  },
  {
    q: "아이폰인데 알림이 안 와요",
    a: "아이폰은 홈 화면에 추가한 아이콘으로 들어와야만 알림이 동작해요. '📲 홈 화면에 추가'를 먼저 해주세요.",
  },
  {
    q: "가입 신청했는데 계속 대기예요",
    a: "운영진이 순서대로 확인하고 있어요. 조금만 기다려주시고, 오래 걸리면 교회 청년부 담당자에게 살짝 물어봐주세요.",
  },
  {
    q: "알림을 껐다가 다시 켜고 싶어요",
    a: "언제든 🪪 내 정보에서 '휴대폰 알림'을 다시 켜고 끌 수 있어요.",
  },
];

function FaqSection() {
  return (
    <section id="faq" className="glass-card scroll-mt-4 p-5 sm:p-6">
      <SectionHead icon="🆘" title="문제 해결" desc="안 될 때 여기부터 확인해보세요" />
      <div className="space-y-2.5">
        {FAQ.map((item) => (
          <details key={item.q} className="glass-soft group rounded-2xl px-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-bold text-ink marker:content-none">
              {item.q}
              <span className="text-lg font-normal text-teal-ink transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="pb-3.5 text-xs leading-relaxed text-ink-soft">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
