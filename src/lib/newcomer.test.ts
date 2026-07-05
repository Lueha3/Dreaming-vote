import { describe, it, expect } from "vitest";
import { isNewcomer, NEWCOMER_WINDOW_DAYS } from "@/lib/newcomer";

describe("isNewcomer", () => {
  it("null이면 false", () => {
    expect(isNewcomer(null)).toBe(false);
  });

  it("승인 직후는 true", () => {
    expect(isNewcomer(new Date())).toBe(true);
  });

  it("윈도우 이내는 true", () => {
    const decided = new Date(Date.now() - (NEWCOMER_WINDOW_DAYS - 1) * 24 * 60 * 60 * 1000);
    expect(isNewcomer(decided)).toBe(true);
  });

  it("윈도우를 지나면 false", () => {
    const decided = new Date(Date.now() - (NEWCOMER_WINDOW_DAYS + 1) * 24 * 60 * 60 * 1000);
    expect(isNewcomer(decided)).toBe(false);
  });

  it("미래 시각(시계 오차 등)은 false", () => {
    const future = new Date(Date.now() + 60_000);
    expect(isNewcomer(future)).toBe(false);
  });
});
