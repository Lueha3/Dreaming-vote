import { describe, expect, it } from "vitest";

import { IDLE_TIMEOUT_MS, evaluateSessionTimeout } from "./sessionTimeout";

const NOW = 1_800_000_000_000;

function evaluate(lastActive: string | null | undefined) {
  return evaluateSessionTimeout({ lastActive, now: NOW });
}

describe("evaluateSessionTimeout", () => {
  it("방금 활동한 세션은 통과하고 만료 시각을 함께 돌려준다", () => {
    const lastActive = NOW - 60_000;
    expect(evaluate(String(lastActive))).toEqual({
      status: "ok",
      idleDeadline: lastActive + IDLE_TIMEOUT_MS,
    });
  });

  it("유휴 2시간이 되면 끊는다", () => {
    expect(evaluate(String(NOW - IDLE_TIMEOUT_MS))).toEqual({ status: "timeout" });
  });

  it("한계 1ms 전까지는 살아있다", () => {
    expect(evaluate(String(NOW - IDLE_TIMEOUT_MS + 1)).status).toBe("ok");
  });

  it("앱을 닫아둔 채 2시간이 지난 경우도 같은 시계로 끊긴다", () => {
    // 앱을 닫으면 heartbeat가 멈출 뿐이라, '무활동'과 '앱 종료'가 같은 판정으로 수렴한다.
    expect(evaluate(String(NOW - 3 * 60 * 60 * 1000))).toEqual({ status: "timeout" });
  });

  it("쿠키가 없으면(정책 시행 전 세션) 끊지 않고 새로 심는다", () => {
    expect(evaluate(undefined).status).toBe("seed");
    expect(evaluate(null).status).toBe("seed");
  });

  it("깨진 타임스탬프는 만료가 아니라 시드로 처리한다", () => {
    for (const bad of ["", " ", "abc", "-1", "1.5", "1e12", "99999999999999999999"]) {
      expect(evaluate(bad).status).toBe("seed");
    }
  });

  it("서버 시계가 어긋나 미래 시각이 들어와도 끊지 않는다", () => {
    expect(evaluate(String(NOW + 60_000)).status).toBe("ok");
  });
});
