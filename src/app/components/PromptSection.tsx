"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { fetchJson, ApiError } from "@/lib/http";
import { createClient } from "@/lib/supabase/client";
import { ArchetypeTags } from "@/app/components/ArchetypeTags";

/* ── 타입 ─────────────────────────────────────────────────────────────────── */

type ReportData = {
  catchphrase: string;
  coreTraits: string;
  optimalEcosystem: string;
  corePosition: string;
};

type ReportResponse = {
  ok: true;
  saved: boolean;
  shareSlug?: string;
  reportData: ReportData;
};

type MembershipResponse = {
  ok: true;
  membership: { membershipStatus: string };
};

/* ── 상수 ─────────────────────────────────────────────────────────────────── */

const PERSONALITY_TYPES = [
  ["INTJ", "INTP", "ENTJ", "ENTP"],
  ["INFJ", "INFP", "ENFJ", "ENFP"],
  ["ISTJ", "ISFJ", "ESTJ", "ESFJ"],
  ["ISTP", "ISFP", "ESTP", "ESFP"],
] as const;

const ALL_TYPES: string[] = PERSONALITY_TYPES.flat();

// 비로그인 클릭 → 로그인 왕복 후 홈으로 돌아왔을 때, 고른 유형을 이어서 처리하기 위한 키
const PENDING_TYPE_KEY = "bh_pending_type";

type Gate = "login" | "join" | "ok";

/* ── 메인 컴포넌트 ────────────────────────────────────────────────────────── */

export function PromptSection() {
  const router = useRouter();

  const [step, setStep] = useState(0);       // 0:메인 2:로딩 3:결과 (1은 삭제됨)
  const [animKey, setAnimKey] = useState(0);
  const [busy, setBusy] = useState(false);   // 게이트 확인~생성 진행 중 (그리드 비활성)

  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [shareSlug, setShareSlug] = useState<string | null>(null);

  const busyRef = useRef(false);     // 연타 재진입 가드 (state보다 즉시 반영)
  const resumedRef = useRef(false);  // 마운트 자동 재개 1회 가드

  function goTo(next: number) {
    setAnimKey((k) => k + 1);
    setStep(next);
  }

  function stashType(type: string) {
    try {
      sessionStorage.setItem(PENDING_TYPE_KEY, type);
    } catch {
      /* 프라이빗 모드 등 sessionStorage 불가 — 자동 재개만 생략, 흐름은 계속 */
    }
  }

  /**
   * 게이트 사전 판정. 생성 로더("성향 카드를 만들고 있어요")를 띄우기 전에
   * 자격을 먼저 확인해 미승인 유저에게 거짓 진행 표시가 보이지 않게 한다.
   * 서버(/api/reports/personality)도 동일 게이트를 재검증하므로 이건 UX용 사전 판정일 뿐.
   */
  async function resolveGate(): Promise<Gate> {
    try {
      // membershipStatus만 보므로 summary 응답(PII 미포함)으로 충분.
      const m = await fetchJson<MembershipResponse>("/api/membership?fields=summary");
      return m.membership.membershipStatus === "approved" ? "ok" : "join";
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return "login";
      // 네트워크 등 기타 오류 — 서버 POST가 최종 판정하도록 일단 진행
      return "ok";
    }
  }

  /**
   * MBTI 선택 처리.
   *   - 비로그인        → 고른 유형 stash 후 /login (성공 후 홈에서 자동 재개)
   *   - 로그인·미승인   → 프로필 설정(/join)으로
   *   - 로그인·승인     → 생성 로더 + 성향 카드
   * 서버 응답코드(401/403)로도 동일하게 백스톱 처리한다.
   */
  async function handlePersonalitySubmit(personalityType: string) {
    if (busyRef.current) return; // 연타 방지
    busyRef.current = true;
    setBusy(true);
    setError(null);

    const gate = await resolveGate();
    if (gate === "login") {
      stashType(personalityType);
      router.push("/login?next=/");
      return; // 이동 중 — busy 유지
    }
    if (gate === "join") {
      router.push("/join");
      return; // 이동 중 — busy 유지
    }

    // 승인 멤버(또는 사전판정 실패 → 서버가 최종 판정) — 이제 생성 로더 표시
    goTo(2);
    try {
      const data = await fetchJson<ReportResponse>("/api/reports/personality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalityType }),
      });

      setReportData(data.reportData);
      if (data.shareSlug) setShareSlug(data.shareSlug);
      goTo(3);
    } catch (e) {
      // 서버 백스톱 — 사전판정을 통과했더라도 서버가 막으면 동일하게 라우팅
      if (e instanceof ApiError && e.status === 401) {
        stashType(personalityType);
        router.push("/login?next=/");
        return;
      }
      if (e instanceof ApiError && e.status === 403) {
        router.push("/join");
        return;
      }
      setError(e instanceof Error ? e.message : "오류가 발생했습니다. 다시 시도해주세요.");
      busyRef.current = false;
      setBusy(false);
      goTo(0);
    }
  }

  // 로그인 왕복 후 홈 복귀 시: stash된 유형이 있고 '로그인 상태'면 자동으로 이어서 처리.
  // (로그인 취소하고 돌아온 경우엔 재개하지 않아 로그인 루프를 막는다.)
  useEffect(() => {
    if (resumedRef.current) return;
    resumedRef.current = true;

    let pending: string | null = null;
    try {
      pending = sessionStorage.getItem(PENDING_TYPE_KEY);
      if (pending) sessionStorage.removeItem(PENDING_TYPE_KEY);
    } catch {
      pending = null;
    }
    if (!pending || !ALL_TYPES.includes(pending)) return;

    const type = pending;
    setBusy(true); // 확인 동안 그리드 비활성 (깜빡임·재클릭 방지)
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (user) {
          void handlePersonalitySubmit(type); // 승인 → 카드, 미승인 → /join
        } else {
          setBusy(false); // 로그인하지 않고 돌아옴 — 메인 그리드로
        }
      })
      .catch(() => setBusy(false));
    // 최초 마운트 1회만 실행 (resumedRef 가드)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full">
      <div key={animKey} className="card-slide-in">
        {step === 0 && (
          <CardMain
            onPersonalitySelect={handlePersonalitySubmit}
            busy={busy}
            error={error}
          />
        )}
        {step === 2 && <CardLoading />}
        {step === 3 && reportData && (
          <CardResult
            reportData={reportData}
            shareSlug={shareSlug}
            router={router}
          />
        )}
      </div>
    </div>
  );
}

/* ── 카드 1: 메인 (MBTI 기본) ──────────────────────────── */

function CardMain({
  onPersonalitySelect,
  busy,
  error,
}: {
  onPersonalitySelect: (type: string) => void;
  busy: boolean;
  error: string | null;
}) {
  return (
    <div className="glass-card glass-ribbon card-glow relative overflow-hidden p-6">
      <h2 className="text-xl font-extrabold tracking-tight text-ink">
        성격유형을 고르면 바로 시작해요
      </h2>
      <p className="mb-4 mt-1.5 text-[13px] font-medium text-ink-faint">
        자신의 MBTI를 선택해주세요.
      </p>

      {error && (
        <div className="mb-3 rounded-xl border border-red-300/60 bg-red-500/[0.08] px-4 py-2.5 text-center text-xs text-red-500">
          {error}
        </div>
      )}

      {/* MBTI 4×4 격자 */}
      <div className={`space-y-2.5 transition-opacity ${busy ? "pointer-events-none opacity-60" : ""}`}>
        {PERSONALITY_TYPES.map((row, rowIdx) => (
          <div key={rowIdx} className="grid grid-cols-4 gap-2.5">
            {row.map((type) => (
              <button
                key={type}
                type="button"
                disabled={busy}
                onClick={() => onPersonalitySelect(type)}
                className="rounded-xl border border-white/95 bg-white/60 py-3 text-[13px] font-bold tracking-[0.07em] text-ink shadow-[0_2px_10px_-3px_rgba(74,144,194,.18)] transition-all hover:-translate-y-[3px] hover:border-transparent hover:text-teal-deep hover:shadow-[0_12px_26px_-8px_rgba(53,195,180,.45)] hover:[background:linear-gradient(#fff,#fff)_padding-box,linear-gradient(120deg,#F0B429,#35C3B4)_border-box] active:-translate-y-px disabled:cursor-not-allowed"
              >
                {type}
              </button>
            ))}
          </div>
        ))}
      </div>

      <p className="mt-5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2.5 text-center text-[13px] font-medium text-ink-soft">
        성격유형을 모른다면?
        <a
          href="https://www.16personalities.com/ko"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-gold inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs"
        >
          무료 검사하기 <span aria-hidden>↗</span>
        </a>
      </p>
    </div>
  );
}

/* ── 카드 3: 로딩 ─────────────────────────────────────────────────────────── */

function CardLoading() {
  return (
    <div className="glass-card flex min-h-72 flex-col items-center justify-center p-8 text-center">
      <div className="relative mb-6">
        <div className="h-14 w-14 animate-spin rounded-full border-2 border-gold/25 border-t-gold-deep" />
        <div className="absolute inset-0 rounded-full bg-gold/10 blur-lg" />
      </div>
      <p className="text-lg font-bold text-ink">분석 중이에요...</p>
      <p className="mt-2 text-sm text-ink-soft">성향 카드를 만들고 있어요</p>
    </div>
  );
}

/* ── 카드 4: 결과 ─────────────────────────────────────────────────────────── */

function CardResult({
  reportData,
  shareSlug,
  router,
}: {
  reportData: ReportData;
  shareSlug: string | null;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <div className="space-y-4">
      {/* 성향 카드 결과 */}
      <div className="glass-card glass-ribbon relative overflow-hidden px-6 py-8 text-center">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-16 left-1/2 h-36 w-72 -translate-x-1/2 rounded-full bg-gold/20 blur-[60px]" />
        </div>

        <div className="relative">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold-ink">
            내 성향 카드
          </p>
          <h2 className="mb-4 text-2xl font-bold text-ink">
            &ldquo;
            <span className="gradient-text">
              {reportData.catchphrase}
            </span>
            &rdquo;
          </h2>

          <div className="mb-2">
            <ArchetypeTags coreTraits={reportData.coreTraits} />
          </div>
          <p className="mb-5 text-[11px] text-ink-faint">
            인물형을 눌러 나와 닮은 성경 인물을 확인해보세요
          </p>

          <p className="text-sm leading-relaxed text-ink-soft">
            {reportData.optimalEcosystem}
          </p>
        </div>
      </div>

      {/* 다음 단계 CTA */}
      <div className="glass-card px-6 py-7 text-center">
        <p className="mb-0.5 text-xs font-semibold uppercase tracking-widest text-teal-ink">
          다음 단계
        </p>
        <p className="mb-5 text-lg font-bold text-ink">
          이제 딱 맞는 동아리를 찾아드릴게요! 🎯
        </p>

        {shareSlug ? (
          <button
            type="button"
            onClick={() => router.push(`/report/${shareSlug}`)}
            className="btn-gold w-full rounded-xl py-4 text-sm font-bold"
          >
            성향 카드 전체 보기 →
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.push("/my")}
            className="btn-gold w-full rounded-xl py-4 text-sm font-bold"
          >
            내 성향 카드 보러가기 →
          </button>
        )}

        <p className="mt-3 text-xs text-ink-faint">
          성향 카드는 &lsquo;내 정보&rsquo;에 저장되어 언제든 다시 볼 수 있어요
        </p>
      </div>
    </div>
  );
}
