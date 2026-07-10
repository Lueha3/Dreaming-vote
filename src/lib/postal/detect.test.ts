import { describe, it, expect } from "vitest";
import { detectKind } from "./detect";

describe("detectKind", () => {
  it("5자리 숫자만 → 우편번호", () => {
    expect(detectKind("06236")).toBe("zipcode");
    expect(detectKind("  06236  ")).toBe("zipcode");
  });
  it("6자리는 우편번호 아님", () => {
    expect(detectKind("135610")).not.toBe("zipcode");
  });
  it("로/길/대로 + 번호 → 도로명", () => {
    expect(detectKind("서울 강남구 테헤란로 152")).toBe("road");
    expect(detectKind("경기 성남시 분당구 불정로 6")).toBe("road");
    expect(detectKind("세종대로 110")).toBe("road");
    expect(detectKind("강남대로 123길 45")).toBe("road");
  });
  it("동 + 번지 → 지번", () => {
    expect(detectKind("서울 강남구 역삼동 737")).toBe("jibun");
    expect(detectKind("역삼동 737-4")).toBe("jibun");
  });
  it("빈 줄 → unknown", () => {
    expect(detectKind("")).toBe("unknown");
    expect(detectKind("   ")).toBe("unknown");
  });
});
