/**
 * 자동 로그아웃 정책 — 마지막 '사용자 조작' 이후 2시간이 지나면 세션을 끊는다.
 * 앱을 닫아둔 시간도 조작이 없는 시간이므로 같은 시계로 계산된다("앱 끈 지 2시간"과 동치).
 *
 * 되감기는 오직 /api/auth/heartbeat POST 뿐이고, 그 POST는 클라이언트가 실제 입력 이벤트
 * (터치·클릭·키·휠)에서만 보낸다. 하단 탭바의 45초 배지 폴링처럼 사람이 만들지 않은
 * 백그라운드 요청은 절대 이 시계를 되감지 않는다 — 되감았다면 앱을 켜둔 것만으로 유휴 판정이
 * 영원히 성립하지 않는다.
 *
 * 로그인 시각 기준의 '절대 수명'은 일부러 두지 않았다. 창을 2시간으로 잡으면
 * lastActive >= sessionStart라 절대 만료가 언제나 먼저 걸려 유휴 규칙이 死문이 되고,
 * 한창 쓰고 있는 사람을 작업 도중에 끊게 된다.
 *
 * 시각은 httpOnly 쿠키에 epoch(ms) 문자열로 담긴다. 클라이언트 JS가 못 읽고 못 쓰므로
 * 남은 시간은 heartbeat 응답으로만 알려준다. 다만 쿠키를 지우는 것 자체는 막을 수 없는데,
 * 지우면 아래 "seed" 판정으로 시계가 새로 시작한다 — 자기 세션을 자기가 연장하는 것뿐이라
 * 권한 상승이 아니고, 실제 보안 경계는 여전히 Supabase JWT 만료다.
 */

/** 마지막 사용자 조작 이후 허용되는 유휴 시간. */
export const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000;

export const LAST_ACTIVE_COOKIE = "dv-la";

/**
 * 쿠키 자체의 수명은 정책 창(2시간)보다 훨씬 길게 잡는다. 쿠키가 만료로 사라지는 것과
 * "정책 시행 전부터 로그인해 있던 세션이라 쿠키가 애초에 없는 것"을 구분할 수 없게 되면,
 * 전자를 후자로 오인해 만료된 세션을 그대로 통과시키게 된다. 판정은 항상 타임스탬프 비교로만 한다.
 */
const COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export type SessionTimeoutVerdict =
  /** 아직 유효 — 만료 시각을 함께 돌려준다(클라이언트 타이머 예약용). */
  | { status: "ok"; idleDeadline: number }
  /** 타임스탬프 쿠키가 없거나 깨졌다 — 지금을 기준으로 새로 심는다(fail-open). */
  | { status: "seed" }
  | { status: "timeout" };

/** epoch(ms) 문자열만 통과. 음수·소수·공백·오버플로는 전부 "없음"으로 본다. */
function parseTimestamp(raw: string | null | undefined): number | null {
  if (!raw || !/^\d{1,15}$/.test(raw)) return null;
  const ms = Number(raw);
  return Number.isSafeInteger(ms) && ms > 0 ? ms : null;
}

/**
 * 쿠키 하나와 현재 시각만으로 세션 판정. 순수 함수 — 미들웨어(edge)와 heartbeat 라우트가
 * 같은 규칙을 쓰도록 한 곳에 모아둔다. 한쪽만 느슨하면 그쪽이 우회로가 된다.
 *
 * 미래 시각(서버 간 시계 어긋남)은 만료로 치지 않는다 — 어긋남 때문에 멀쩡한 세션을
 * 끊는 쪽이, 몇 초 늦게 끊는 쪽보다 훨씬 나쁘다.
 */
export function evaluateSessionTimeout(input: {
  lastActive: string | null | undefined;
  now: number;
}): SessionTimeoutVerdict {
  const lastActive = parseTimestamp(input.lastActive);
  if (lastActive === null) return { status: "seed" };
  if (input.now - lastActive >= IDLE_TIMEOUT_MS) return { status: "timeout" };
  return { status: "ok", idleDeadline: lastActive + IDLE_TIMEOUT_MS };
}

/** 타임스탬프 쿠키 공통 옵션 — JS가 못 읽도록 httpOnly. */
export function timestampCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  };
}

export const SESSION_TIMEOUT_CODE = "session_timeout";

export const SESSION_TIMEOUT_MESSAGE =
  "2시간 동안 활동이 없어 자동으로 로그아웃되었어요. 다시 로그인해주세요.";
