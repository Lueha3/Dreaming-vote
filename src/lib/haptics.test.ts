import { describe, expect, it, vi, afterEach } from "vitest";
import { triggerHaptic } from "./haptics";

describe("triggerHaptic", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("Android 등 Vibration API 지원 브라우저에서는 짧게 진동시킨다", () => {
    const vibrate = vi.fn();
    vi.stubGlobal("navigator", { vibrate });

    triggerHaptic();

    expect(vibrate).toHaveBeenCalledWith(8);
  });

  it("커스텀 duration을 그대로 전달한다", () => {
    const vibrate = vi.fn();
    vi.stubGlobal("navigator", { vibrate });

    triggerHaptic(20);

    expect(vibrate).toHaveBeenCalledWith(20);
  });

  it("iOS Safari처럼 navigator.vibrate가 없으면 조용히 아무 일도 하지 않는다", () => {
    vi.stubGlobal("navigator", {});

    expect(() => triggerHaptic()).not.toThrow();
  });

  it("navigator.vibrate가 예외를 던져도 삼킨다(best-effort)", () => {
    const vibrate = vi.fn(() => {
      throw new Error("permission denied");
    });
    vi.stubGlobal("navigator", { vibrate });

    expect(() => triggerHaptic()).not.toThrow();
  });
});
